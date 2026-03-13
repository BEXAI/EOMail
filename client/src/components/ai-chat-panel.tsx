import { useState, useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bot,
  Send,
  X,
  Sparkles,
  Shield,
  DollarSign,
  Calendar,
  Loader2,
  MessageSquare,
  Trash2,
  Maximize2,
  Minimize2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

interface AiChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onExpandChange?: (expanded: boolean) => void;
  emailId?: string;
}

const QUICK_ACTIONS = [
  { label: "Scan for threats", icon: Shield, prompt: "Aegis, scan my inbox for any phishing or impersonation threats and report what you find." },
  { label: "Financial summary", icon: DollarSign, prompt: "FinOps, give me a summary of all financial emails — invoices, receipts, and subscriptions." },
  { label: "Schedule overview", icon: Calendar, prompt: "Chrono, list all scheduling and meeting requests in my inbox with dates and times." },
  { label: "Inbox briefing", icon: Sparkles, prompt: "Give me a full AI summary briefing on my inbox status, priorities, and recommended actions." },
];

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatMessage(content: string): string {
  const escaped = escapeHtml(content);
  let html = escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code class='bg-muted px-1 py-0.5 rounded text-xs font-mono'>$1</code>")
    .replace(/^• (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class='ml-4 list-decimal'>$1. $2</li>")
    .replace(/\n/g, "<br/>");
  return DOMPurify.sanitize(html);
}

export function AiChatPanel({ isOpen, onToggle, onExpandChange, emailId }: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: historyData } = useQuery({
    queryKey: ["/api/ai/chat/history", emailId],
    queryFn: async () => {
      const url = emailId ? `/api/ai/chat/history?emailId=${emailId}` : "/api/ai/chat/history";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (historyData) {
      setMessages(historyData.map((msg: any) => ({ role: msg.role, content: msg.content })));
    } else {
      setMessages([]);
    }
  }, [historyData, emailId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    onExpandChange?.(isFullscreen);
  }, [onExpandChange, isFullscreen]);

  const [lastFailedMessages, setLastFailedMessages] = useState<ChatMessage[] | null>(null);

  const chatMutation = useMutation({
    mutationFn: async (newMessages: ChatMessage[]) => {
      const res = await apiRequest("POST", "/api/ai/chat", { messages: newMessages, emailId });
      return res.json();
    },
    onSuccess: (data) => {
      setLastFailedMessages(null);
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    },
    onError: (error: Error) => {
      const errMsg = error.message || "";
      const isBilling = errMsg.includes("503") || errMsg.includes("AI_BILLING") || errMsg.includes("unavailable");
      const isNotConfigured = errMsg.includes("AI_NOT_CONFIGURED") || errMsg.includes("not configured");
      let content: string;
      if (isBilling) {
        content = "AI service is temporarily unavailable due to billing. Your emails, folders, and all other features continue to work normally. An administrator needs to add credits to the AI provider.";
      } else if (isNotConfigured) {
        content = "AI service is not yet configured. Please set the ANTHROPIC_API_KEY environment variable in Render.";
      } else {
        content = "I encountered an error processing that request. Please try again.";
      }
      setMessages((prev) => [...prev, { role: "assistant", content: `__ERROR__${content}` }]);
      // Save failed messages for retry
      setLastFailedMessages(messages);
    },
  });

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || chatMutation.isPending) return;
      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      const updated = [...messages, userMsg];
      setMessages(updated);
      setInput("");
      chatMutation.mutate(updated);
    },
    [messages, chatMutation]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/ai/chat/history", { emailId });
    },
    onSuccess: () => {
      setMessages([]);
      setInput("");
    },
  });

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear this chat history?")) {
      clearMutation.mutate();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-2xl shadow-violet-900/40 hover:shadow-violet-700/60 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center group"
          data-testid="button-ai-chat-fab"
        >
          <div className="absolute inset-0 bg-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
          <div className="relative">
            <MessageSquare className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
            <span className="absolute -top-3 -right-3 px-1.5 py-0.5 bg-emerald-400 text-black text-[8px] font-black rounded-full border-4 border-background animate-pulse">LIVE</span>
          </div>
        </button>
      )}

      {isOpen && (
        <div
          className={cn(
            "fixed z-50 transition-all duration-500 ease-in-out",
            isFullscreen
              ? "inset-4 sm:inset-10"
              : "bottom-6 right-6 w-[420px] h-[680px] max-h-[calc(100vh-60px)]"
          )}
          data-testid="panel-ai-chat"
        >
          <div className={cn(
            "relative flex flex-col h-full overflow-hidden",
            "rounded-3xl border border-border",
            "bg-background/98 backdrop-blur-3xl",
            "shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          )}>
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent pointer-events-none" />

            <div className="relative flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative group/bot">
                  <div className="absolute -inset-1.5 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl blur opacity-30 group-hover/bot:opacity-50 transition duration-300"></div>
                  <div className="relative w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center shadow-xl">
                    <Bot className="w-6 h-6 text-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-widest text-foreground uppercase italic">
                    Command Center
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Active Status</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {messages.length > 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                    onClick={clearChat}
                    data-testid="button-clear-chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  data-testid="button-fullscreen-chat"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all ml-1"
                  onClick={onToggle}
                  data-testid="button-close-chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-8">
                  <div className="relative px-8">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-20" />
                    <div className="relative flex flex-col items-center text-center space-y-4">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/10 to-indigo-600/10 border border-border flex items-center justify-center shadow-2xl">
                        <Sparkles className="w-10 h-10 text-violet-400" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">How can I assist you?</h2>
                        <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
                          Deploy agentic operations or analyze your private eomail.co communications.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full max-w-[400px]">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.prompt)}
                        className="flex flex-col items-start gap-2 p-3.5 rounded-2xl bg-muted/30 hover:bg-muted/60 border border-border hover:border-border/80 transition-all duration-200 text-left group"
                        data-testid={`button-quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <action.icon className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => {
                const isError = msg.role === "assistant" && msg.content.startsWith("__ERROR__");
                const displayContent = isError ? msg.content.slice(9) : msg.content;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] text-[14px] leading-relaxed shadow-xl",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl rounded-tr-none px-4 py-3 border border-violet-500/20"
                          : isError
                            ? "bg-amber-500/10 text-foreground border border-amber-500/30 rounded-2xl rounded-tl-none px-4 py-3"
                            : "bg-muted/50 text-foreground border border-border rounded-2xl rounded-tl-none px-4 py-3"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn("w-5 h-5 rounded flex items-center justify-center", isError ? "bg-amber-500/20" : "bg-violet-500/20")}>
                            {isError ? <AlertTriangle className="w-3 h-3 text-amber-500" /> : <Bot className="w-3 h-3 text-violet-400" />}
                          </div>
                          <span className={cn("text-[10px] font-black uppercase tracking-widest italic", isError ? "text-amber-500" : "text-violet-400")}>
                            {isError ? "Service Notice" : "AI Assistant"}
                          </span>
                        </div>
                      )}
                      <div
                        className="whitespace-pre-wrap break-words font-medium [&_strong]:text-foreground [&_strong]:font-black [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_li]:my-1"
                        dangerouslySetInnerHTML={{ __html: formatMessage(displayContent) }}
                      />
                      {isError && lastFailedMessages && i === messages.length - 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 gap-2 text-xs border-amber-500/30 hover:bg-amber-500/10"
                          onClick={() => {
                            setMessages(lastFailedMessages);
                            setLastFailedMessages(null);
                            chatMutation.mutate([...lastFailedMessages, messages[messages.length - 2] || { role: "user", content: "" }]);
                          }}
                          disabled={chatMutation.isPending}
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted/30 border border-border rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Synthesizing Inbox Intelligence...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="relative px-6 py-6 shrink-0 border-t border-border bg-card/50">
              <div className="flex items-end gap-3 bg-muted/30 border border-border rounded-2xl p-3 focus-within:border-primary/40 focus-within:bg-muted/50 transition-all duration-300 shadow-inner">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message your AI Assistant..."
                  className="flex-1 bg-transparent border-0 outline-none text-[14px] text-foreground placeholder:text-muted-foreground resize-none min-h-[24px] max-h-[140px] py-1 px-1 font-medium"
                  rows={1}
                  data-testid="input-ai-chat"
                />
                <Button
                  size="icon"
                  className={cn(
                    "h-9 w-9 shrink-0 rounded-xl transition-all duration-300",
                    input.trim()
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:scale-105 shadow-lg shadow-violet-900/40 text-white"
                      : "bg-muted text-muted-foreground/30"
                  )}
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || chatMutation.isPending}
                  data-testid="button-send-chat"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
