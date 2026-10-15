import { resend } from "./resend-client";

const DOMAIN = process.env.DOMAIN || "eomail.co";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Turns a provider error into a message safe to show users. Configuration problems
 * (bad API key, unverified domain) are the operator's to fix, so users get a generic note.
 */
export function userFacingSendError(raw?: string): string {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("api key") || msg.includes("not configured") || msg.includes("domain") || msg.includes("not verified")) {
    return "Outgoing mail is temporarily unavailable, so your message was not sent.";
  }
  return raw ? `Your message could not be delivered: ${raw}` : "Your message could not be delivered.";
}

export async function sendEmail(opts: {
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
  cc?: string;
  bcc?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    // Quote the display name so commas and other specials keep the header valid
    const displayName = `"${opts.from.replace(/["\\\r\n]/g, "")}"`;
    const fromAddress = opts.fromEmail.endsWith(`@${DOMAIN}`)
      ? `${displayName} <${opts.fromEmail}>`
      : `${displayName} <noreply@${DOMAIN}>`;

    const payload: Parameters<typeof resend.emails.send>[0] = {
      from: fromAddress,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.cc && { cc: opts.cc.split(",").map((e: string) => e.trim()).filter(Boolean) }),
      ...(opts.bcc && { bcc: opts.bcc.split(",").map((e: string) => e.trim()).filter(Boolean) }),
    };

    const { data, error } = await resend.emails.send(payload);
    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (e) {
    console.error("Email send error:", e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendPasswordResetEmail(to: string, token: string, displayName: string): Promise<boolean> {
  const resetUrl = `https://${DOMAIN}/reset-password?token=${token}`;
  const { success } = await sendEmail({
    from: "EOMail",
    fromEmail: `noreply@${DOMAIN}`,
    to,
    subject: "Reset your EOMail password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="margin-bottom: 16px;">Reset your password</h2>
        <p>Hi ${escapeHtml(displayName)},</p>
        <p>We received a request to reset the password for your EOMail account. Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Reset Password</a>
        <p style="color: #64748b; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">EOMail.co — Your autonomous Chief of Staff</p>
      </div>
    `,
  });
  return success;
}

export async function sendVerificationEmail(to: string, token: string, displayName: string): Promise<boolean> {
  const verifyUrl = `https://${DOMAIN}/verify-email?token=${token}`;
  const { success } = await sendEmail({
    from: "EOMail",
    fromEmail: `noreply@${DOMAIN}`,
    to,
    subject: "Verify your EOMail account",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="margin-bottom: 16px;">Welcome to EOMail!</h2>
        <p>Hi ${escapeHtml(displayName)},</p>
        <p>Thanks for signing up. Please verify your email address to activate your account:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Verify Email</a>
        <p style="color: #64748b; font-size: 13px;">If you didn't create an account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">EOMail.co — Your autonomous Chief of Staff</p>
      </div>
    `,
  });
  return success;
}
