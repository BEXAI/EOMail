import { storage } from "./storage";
import { summarizeEmail, classifyEmail, draftReply, analyzeSpamRisk, extractFinancialDocument, summarizeThread } from "./ai";
import { emailContextIndex } from "./ai-context";
import pLimit from "p-limit";
import type { Email } from "@shared/schema";
import { detectThread } from "./thread-service";
import { performEnhancedThreatAnalysis, autoQuarantineEmail } from "./quarantine-service";
import { processMeetingExtraction } from "./chrono-pipeline";
import { compressThread, formatThreadForPrompt } from "./system-wrapper/context-manager";

const MAX_BATCH_SIZE = 50;

function getAgentName(category: string): string {
  switch (category) {
    case "finance":
      return "FinOps Auto-Resolver";
    case "scheduling":
      return "Chrono-Logistics Coordinator";
    default:
      return "EOMail Assistant";
  }
}

export async function processEmail(emailId: string, userId: string, userDisplayName?: string, preloadedEmail?: Email): Promise<Email | null> {
  const email = preloadedEmail ?? await storage.getEmail(emailId, userId);
  if (!email) return null;

  const displayName = userDisplayName || "User";

  const gatekeeperActivity = await storage.createAgentActivity({
    userId,
    agentName: "Aegis Gatekeeper",
    action: `Scanning "${email.subject.slice(0, 35)}${email.subject.length > 35 ? "..." : ""}"`,
    status: "pending",
    emailId: email.id,
    detail: null,
  });

  try {
    const [summary, classification, spamAnalysis] = await Promise.all([
      summarizeEmail(email.subject, email.body),
      classifyEmail(email.from, email.subject, email.body),
      analyzeSpamRisk(email.from, email.fromEmail, email.subject, email.body),
    ]);

    const agentName = getAgentName(classification.category);

    await storage.updateAgentActivity(gatekeeperActivity.id, userId, {
      status: "complete",
      detail: spamAnalysis.score > 70
        ? `Threat detected: ${spamAnalysis.threatType} (${spamAnalysis.score}% risk)`
        : `Cleared — ${spamAnalysis.threatType} (${spamAnalysis.score}% risk)`,
    });

    const classifyActivity = await storage.createAgentActivity({
      userId,
      agentName,
      action: `${agentName === "FinOps Auto-Resolver" ? "Processing" : agentName === "Chrono-Logistics Coordinator" ? "Scheduling" : "Analyzing"} "${email.subject.slice(0, 35)}${email.subject.length > 35 ? "..." : ""}"`,
      status: "pending",
      emailId: email.id,
      detail: null,
    });

    let aiDraftReplyText: string | null = null;
    if (
      email.folder === "inbox" &&
      classification.suggestedAction === "reply" &&
      email.fromEmail !== "me@eomail.co"
    ) {
      aiDraftReplyText = await draftReply(email, displayName, undefined, userId);
    }

    const spamReasonWithMeta = JSON.stringify({
      reason: spamAnalysis.reason,
      threatType: spamAnalysis.threatType,
      impersonationProbability: spamAnalysis.impersonationProbability,
    });

    const updated = await storage.updateEmail(emailId, userId, {
      aiSummary: summary,
      aiCategory: classification.category,
      aiUrgency: classification.urgency,
      aiSuggestedAction: classification.suggestedAction,
      aiDraftReply: aiDraftReplyText,
      aiSpamScore: spamAnalysis.score,
      aiSpamReason: spamReasonWithMeta,
      aiProcessed: true,
    });

    const detailParts = [`Classified as ${classification.category} (${classification.urgency} urgency)`];
    if (aiDraftReplyText) detailParts.push("draft reply generated");
    if (classification.category === "finance") detailParts.push("financial data extracted");
    if (classification.category === "scheduling") detailParts.push("calendar event detected");

    await storage.updateAgentActivity(classifyActivity.id, userId, {
      status: "complete",
      detail: detailParts.join(" — "),
    });

    // ─── Phase 2: Extended Processing ──────────────────────────────────

    // 1. Thread Detection — always run
    try {
      const threadInfo = detectThread(email);
      await storage.updateEmail(emailId, userId, {
        threadId: threadInfo.threadId,
        threadSubject: threadInfo.threadSubject,
      });
    } catch (threadErr) {
      console.error(`[Thread Detection] Failed for email ${emailId}:`, threadErr);
    }

    // 2. Enhanced Threat Analysis — if spam score >= 40
    if (spamAnalysis.score >= 40) {
      try {
        const enhancedThreat = await performEnhancedThreatAnalysis(
          email,
          spamAnalysis.score,
          spamAnalysis.reason,
          spamAnalysis.threatType
        );

        if (enhancedThreat.shouldQuarantine) {
          await autoQuarantineEmail(emailId, userId, enhancedThreat);
          await storage.createAgentActivity({
            userId,
            agentName: "Aegis Gatekeeper",
            action: `Auto-quarantined "${email.subject.slice(0, 35)}${email.subject.length > 35 ? "..." : ""}"`,
            status: "complete",
            emailId: email.id,
            detail: `Threat score: ${enhancedThreat.combinedScore} — ${enhancedThreat.threatType}. ${enhancedThreat.detectedUrls.length} URL(s) analyzed.`,
          });
        }
      } catch (threatErr) {
        console.error(`[Enhanced Threat] Failed for email ${emailId}:`, threatErr);
      }
    }

    // 3. FinOps Extraction — if category is "finance"
    if (classification.category === "finance") {
      try {
        const finData = await extractFinancialDocument(
          email.from,
          email.fromEmail,
          email.subject,
          email.body
        );

        if (finData && finData.confidenceScore >= 30) {
          const existing = await storage.getFinancialDocumentByEmail(emailId, userId);
          if (!existing) {
            await storage.createFinancialDocument({
              userId,
              emailId,
              documentType: finData.documentType,
              status: "extracted",
              vendorName: finData.vendorName,
              vendorEmail: finData.vendorEmail,
              invoiceNumber: finData.invoiceNumber,
              invoiceDate: finData.invoiceDate ? new Date(finData.invoiceDate) : null,
              dueDate: finData.dueDate ? new Date(finData.dueDate) : null,
              currency: finData.currency,
              subtotal: finData.subtotal?.toString() ?? null,
              tax: finData.tax?.toString() ?? null,
              shipping: finData.shipping?.toString() ?? null,
              discount: finData.discount?.toString() ?? null,
              total: finData.total.toString(),
              lineItems: finData.lineItems,
              paymentStatus: finData.paymentStatus,
              confidenceScore: finData.confidenceScore,
              rawExtraction: finData,
            });

            await storage.createAgentActivity({
              userId,
              agentName: "FinOps Auto-Resolver",
              action: `Extracted financial data from "${email.subject.slice(0, 35)}${email.subject.length > 35 ? "..." : ""}"`,
              status: "complete",
              emailId: email.id,
              detail: `${finData.documentType}: ${finData.currency} ${finData.total} from ${finData.vendorName || "unknown vendor"} (${finData.confidenceScore}% confidence)`,
            });
          }
        }
      } catch (finErr) {
        console.error(`[FinOps] Failed for email ${emailId}:`, finErr);
      }
    }

    // 4. Chrono Meeting Extraction — if category is "scheduling"
    if (classification.category === "scheduling") {
      try {
        const eventId = await processMeetingExtraction(email, userId);

        if (eventId) {
          await storage.createAgentActivity({
            userId,
            agentName: "Chrono-Logistics Coordinator",
            action: `Extracted meeting from "${email.subject.slice(0, 35)}${email.subject.length > 35 ? "..." : ""}"`,
            status: "complete",
            emailId: email.id,
            detail: `Calendar event created (${eventId})`,
          });
        }
      } catch (chronoErr) {
        console.error(`[Chrono] Failed for email ${emailId}:`, chronoErr);
      }
    }

    emailContextIndex.invalidate(userId);

    return updated || email;
  } catch (error) {
    console.error(`AI processing failed for email ${emailId}:`, error);
    await storage.updateAgentActivity(gatekeeperActivity.id, userId, {
      status: "error",
      detail: error instanceof Error ? error.message : "Unknown error",
    });

    await storage.updateEmail(emailId, userId, { aiProcessed: true });
    emailContextIndex.invalidate(userId);
    return email;
  }
}

export async function processAllUnprocessed(userId: string, userDisplayName: string): Promise<number> {
  const unprocessed = await storage.getUnprocessedEmails(userId);
  if (unprocessed.length === 0) return 0;

  const batch = unprocessed.slice(0, MAX_BATCH_SIZE);
  const limit = pLimit(3);

  const results = await Promise.allSettled(
    batch.map((email) =>
      limit(() => processEmail(email.id, userId, userDisplayName, email))
    )
  );

  return results.filter((r) => r.status === "fulfilled").length;
}

/**
 * Process thread digests for all threads with >= 2 messages
 * that haven't been AI-processed yet.
 */
export async function processThreadDigests(userId: string): Promise<number> {
  try {
    const allEmails = await storage.getEmails(userId, "all", undefined, undefined, 200);
    const threadMap = new Map<string, Email[]>();

    for (const email of allEmails) {
      if (!email.threadId) continue;
      if (!threadMap.has(email.threadId)) threadMap.set(email.threadId, []);
      threadMap.get(email.threadId)!.push(email);
    }

    let processedCount = 0;
    const limit = pLimit(2);

    const tasks = Array.from(threadMap.entries())
      .filter(([, emails]) => emails.length >= 2)
      .map(([threadId, threadEmails]) =>
        limit(async () => {
          const existingThread = await storage.getThreadSummary(threadId, userId);
          if (existingThread?.aiProcessed) return;

          threadEmails.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          const compressed = compressThread(threadEmails);
          const threadContext = formatThreadForPrompt(compressed);
          const participants = [...new Set(threadEmails.map((e) => e.from))].join(", ");
          const threadSubject = threadEmails[0].threadSubject || threadEmails[0].subject;

          const digest = await summarizeThread(threadContext, participants, threadEmails.length);

          await storage.getOrCreateEmailThread(threadId, userId, {
            id: threadId,
            userId,
            subject: threadSubject,
            participants: [...new Set(threadEmails.flatMap((e) => [e.from, e.to]))],
            messageCount: threadEmails.length,
            firstMessageDate: threadEmails[0].timestamp,
            lastMessageDate: threadEmails[threadEmails.length - 1].timestamp,
            digest: digest.digest,
            keyPoints: digest.keyPoints,
            aiProcessed: true,
          });

          for (let i = 0; i < threadEmails.length; i++) {
            await storage.updateEmail(threadEmails[i].id, userId, {
              threadPosition: i + 1,
            });
          }

          processedCount++;
        })
      );

    await Promise.allSettled(tasks);
    return processedCount;
  } catch (error) {
    console.error("[Thread Digests] Failed:", error);
    return 0;
  }
}
