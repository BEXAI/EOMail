import { storage } from "./storage";
import { analyzeUrls } from "./ai";
import { extractUrls, neutralizeUrls } from "./url-neutralizer";
import { analyzeDomain, analyzeDomainsFromUrls } from "./domain-analyzer";
import type { Email, InsertQuarantineAction, InsertThreatScanLog } from "@shared/schema";

interface EnhancedThreatAnalysis {
  combinedScore: number;
  detectedUrls: string[];
  neutralizedUrls: string[];
  domainAnalysis: Record<string, unknown>;
  urlAnalysisResults: unknown;
  shouldQuarantine: boolean;
  threatType: string;
  quarantineReason: string;
  scanDurationMs: number;
}

/**
 * Perform enhanced threat analysis: URL extraction + AI URL check + domain reputation.
 * Weighted blend: 50% spam + 30% URL risk + 20% domain risk.
 */
export async function performEnhancedThreatAnalysis(
  email: Email,
  baseSpamScore: number,
  baseSpamReason: string,
  baseThreatType: string
): Promise<EnhancedThreatAnalysis> {
  const startTime = Date.now();

  const detectedUrls = extractUrls(email.body);

  let urlRisk = 0;
  let urlAnalysisResults: unknown = null;

  if (detectedUrls.length > 0) {
    const emailContext = `From: ${email.from} <${email.fromEmail}>, Subject: ${email.subject}`;
    const urlAnalysis = await analyzeUrls(detectedUrls, emailContext);
    urlRisk = urlAnalysis.overallRisk;
    urlAnalysisResults = urlAnalysis;
  }

  const senderDomainAnalysis = analyzeDomain(email.fromEmail);
  const urlDomainAnalyses = analyzeDomainsFromUrls(detectedUrls);

  const domainAnalysisObj: Record<string, unknown> = {
    sender: senderDomainAnalysis,
    urls: Object.fromEntries(urlDomainAnalyses),
  };

  const combinedScore = Math.min(100, Math.round(
    baseSpamScore * 0.5 +
    urlRisk * 0.3 +
    senderDomainAnalysis.riskScore * 0.2
  ));

  const shouldQuarantine = combinedScore >= 75;
  const neutralizedUrlList = neutralizeUrls(detectedUrls);

  const reasons: string[] = [baseSpamReason];
  if (urlRisk > 50) reasons.push(`URLs flagged (risk: ${urlRisk})`);
  if (senderDomainAnalysis.flags.length > 0) reasons.push(senderDomainAnalysis.flags.join("; "));

  return {
    combinedScore,
    detectedUrls,
    neutralizedUrls: neutralizedUrlList,
    domainAnalysis: domainAnalysisObj,
    urlAnalysisResults,
    shouldQuarantine,
    threatType: combinedScore >= 75 ? baseThreatType : "legitimate",
    quarantineReason: reasons.join(" | "),
    scanDurationMs: Date.now() - startTime,
  };
}

/**
 * Auto-quarantine an email: move to quarantine folder, create records, log scan.
 */
export async function autoQuarantineEmail(
  emailId: string,
  userId: string,
  analysis: EnhancedThreatAnalysis
): Promise<void> {
  try {
    await storage.updateEmail(emailId, userId, {
      folder: "quarantine",
    });

    const quarantineData: InsertQuarantineAction = {
      userId,
      emailId,
      threatScore: analysis.combinedScore,
      threatType: analysis.threatType,
      quarantineReason: analysis.quarantineReason,
      detectedUrls: analysis.detectedUrls,
      neutralizedUrls: analysis.neutralizedUrls,
      domainAnalysis: analysis.domainAnalysis,
      autoQuarantined: true,
      releaseStatus: "quarantined",
    };
    await storage.createQuarantineAction(quarantineData);

    const scanLog: InsertThreatScanLog = {
      userId,
      emailId,
      scanType: "inbound",
      threatLevel: analysis.combinedScore >= 90 ? "critical" : analysis.combinedScore >= 75 ? "high" : "medium",
      scanDuration: analysis.scanDurationMs,
      detections: {
        urlAnalysis: analysis.urlAnalysisResults,
        domainAnalysis: analysis.domainAnalysis,
        combinedScore: analysis.combinedScore,
      },
      aiModelVersion: "gpt-4o-mini",
    };
    await storage.createThreatScanLog(scanLog);

    console.log(`[Quarantine] Email ${emailId} auto-quarantined (score: ${analysis.combinedScore})`);
  } catch (error) {
    console.error(`[Quarantine] Failed to auto-quarantine email ${emailId}:`, error);
  }
}
