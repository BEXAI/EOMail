import { Resend } from "resend";

// Tolerate common paste mistakes in the dashboard: surrounding whitespace, newlines, or quotes
const apiKey = process.env.RESEND_API_KEY?.trim().replace(/^["']|["']$/g, "").trim();

export const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Startup diagnostic: asks Resend whether the key is accepted. Logs only the key's shape,
 * never its value. A sending-only key is rejected for listing domains with a "restricted"
 * error, which still proves the key itself is valid.
 */
export async function checkResendKey(): Promise<void> {
  if (!resend || !apiKey) {
    console.warn("[email] RESEND_API_KEY not set; outgoing mail is disabled");
    return;
  }
  const raw = process.env.RESEND_API_KEY ?? "";
  const shape = `prefix ${apiKey.startsWith("re_") ? "re_" : "missing re_"}, length ${apiKey.length}${raw !== apiKey ? ", whitespace/quotes stripped" : ""}`;
  try {
    const { error } = await resend.domains.list();
    if (!error) {
      console.log(`[email] Resend API key OK (${shape})`);
    } else if (/restricted/i.test(`${error.name} ${error.message}`)) {
      console.log(`[email] Resend API key OK, sending-only (${shape})`);
    } else {
      console.error(`[email] Resend API key REJECTED: ${error.message} (${shape})`);
    }
  } catch (err) {
    console.error("[email] Could not reach Resend to check the API key:", err);
  }
}
