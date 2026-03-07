import { storage } from "./storage";
import { summarizeEmail, classifyEmail, draftReply, analyzeSpamRisk } from "./ai";
import type { Email } from "@shared/schema";

export async function processEmail(emailId: string, userId: string, userDisplayName: string): Promise<Email | null> {
  const email = await storage.getEmail(emailId, userId);
  if (!email) return null;

  const activityId = await storage.createAgentActivity({
    userId,
    action: `Analyzing "${email.subject.slice(0, 40)}${email.subject.length > 40 ? "..." : ""}"`,
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

    let aiDraftReplyText: string | null = null;
    if (
      email.folder === "inbox" &&
      classification.suggestedAction === "reply" &&
      email.fromEmail !== "me@aimail.com"
    ) {
      aiDraftReplyText = await draftReply(email, userDisplayName);
    }

    const updated = await storage.updateEmail(emailId, userId, {
      aiSummary: summary,
      aiCategory: classification.category,
      aiUrgency: classification.urgency,
      aiSuggestedAction: classification.suggestedAction,
      aiDraftReply: aiDraftReplyText,
      aiSpamScore: spamAnalysis.score,
      aiSpamReason: spamAnalysis.reason,
      aiProcessed: true,
    });

    await storage.updateAgentActivity(activityId.id, {
      status: "complete",
      detail: `Classified as ${classification.category} (${classification.urgency} urgency)${aiDraftReplyText ? " — draft reply generated" : ""}`,
    });

    return updated || email;
  } catch (error) {
    console.error(`AI processing failed for email ${emailId}:`, error);
    await storage.updateAgentActivity(activityId.id, {
      status: "error",
      detail: error instanceof Error ? error.message : "Unknown error",
    });

    await storage.updateEmail(emailId, userId, { aiProcessed: true });
    return email;
  }
}

export async function processAllUnprocessed(userId: string, userDisplayName: string): Promise<number> {
  const unprocessed = await storage.getUnprocessedEmails(userId);
  if (unprocessed.length === 0) return 0;

  let processed = 0;
  for (const email of unprocessed) {
    await processEmail(email.id, userId, userDisplayName);
    processed++;
  }
  return processed;
}
