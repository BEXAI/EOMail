import { storage } from "./storage";
import { summarizeEmail, classifyEmail, draftReply, analyzeSpamRisk } from "./ai";
import { emailContextIndex } from "./ai-context";
import type { Email } from "@shared/schema";

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

  let processed = 0;
  for (const email of unprocessed) {
    await processEmail(email.id, userId, userDisplayName, email);
    processed++;
  }
  return processed;
}
