// Extracted from ai-chat-panel.tsx to avoid esbuild regex/JSX conflict in .tsx files

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatMessage(content: string): string {
  const escaped = escapeHtml(content);
  let html = escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code class='bg-white/10 px-1 py-0.5 rounded text-xs font-mono'>$1</code>")
    .replace(/^• (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class='ml-4 list-decimal'>$1. $2</li>")
    .replace(/\n/g, "<br/>");
  return html;
}
