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
    .replace(/`([^`]+)`/g, "<code class='bg-white/10 px-1 py-0.5 rounded text-xs font-mono'>$1</code>")
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
      const res = await fetch(url);
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

  const chatMutation = useMutation({
    mutationFn: async (newMessages: ChatMessage[]) => {
      const res = await apiRequest("POST", "/api/ai/chat", { messages: newMessages, emailId });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I encountered an error processing that request. Please try again." },
      ]);
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
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
          <div className="relative">
            <MessageSquare className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
            <span className="absolute -top-3 -right-3 px-1.5 py-0.5 bg-emerald-400 text-black text-[8px] font-black rounded-full border-4 border-[#0a0a0f] animate-pulse">LIVE</span>
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
            "rounded-3xl border border-white/[0.12]",
            "bg-[#0a0a0f]/98 backdrop-blur-3xl",
            "shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          )}>
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent pointer-events-none" />

            <div className="relative flex items-center justify-between px-6 py-5 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative group/bot">
                  <div className="absolute -inset-1.5 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl blur opacity-30 group-hover/bot:opacity-50 transition duration-300"></div>
                  <div className="relative w-11 h-11 rounded-xl bg-[#11111a] border border-white/10 flex items-center justify-center shadow-xl">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-widest text-white uppercase italic">
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
                    className="h-8 w-8 text-white/30 hover:text-white/80 hover:bg-white/[0.08] rounded-xl transition-all"
                    onClick={clearChat}
                    data-testid="button-clear-chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white/30 hover:text-white/80 hover:bg-white/[0.08] rounded-xl transition-all"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  data-testid="button-fullscreen-chat"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all ml-1"
                  onClick={onToggle}
                  data-testid="button-close-chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-8">
                  <div className="relative px-8">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-20" />
                    <div className="relative flex flex-col items-center text-center space-y-4">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/10 to-indigo-600/10 border border-white/5 flex items-center justify-center shadow-2xl">
                        <Sparkles className="w-10 h-10 text-violet-400" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white tracking-tight">How can I assist you?</h2>
                        <p className="text-sm text-white/40 max-w-[280px] leading-relaxed">
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
                        className="flex flex-col items-start gap-2 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 text-left group"
                        data-testid={`button-quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <action.icon className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-white/60 group-hover:text-white/90">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
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
                        ? "bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl rounded-tr-none px-4 py-3 border border-white/10"
                        : "bg-white/[0.05] text-white/90 border border-white/[0.08] rounded-2xl rounded-tl-none px-4 py-3"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded bg-violet-500/20 flex items-center justify-center">
                          <Bot className="w-3 h-3 text-violet-400" />
                        </div>
                        <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest italic">
                          AI Assistant
                        </span>
                      </div>
                    )}
                    <div
                      className="whitespace-pre-wrap break-words prose-invert font-medium [&_strong]:text-white [&_strong]:font-black [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_li]:my-1"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  </div>
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                    </div>
                    <span className="text-xs font-bold text-white/30 uppercase tracking-widest">Synthesizing Inbox Intelligence...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="relative px-6 py-6 shrink-0 border-t border-white/[0.05] bg-[#0d0d15]/50">
              <div className="flex items-end gap-3 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 focus-within:border-primary/40 focus-within:bg-white/[0.06] transition-all duration-300 shadow-inner">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message your AI Assistant..."
                  className="flex-1 bg-transparent border-0 outline-none text-[14px] text-white/90 placeholder:text-white/20 resize-none min-h-[24px] max-h-[140px] py-1 px-1 font-medium"
                  rows={1}
                  data-testid="input-ai-chat"
                />
                <Button
                  size="icon"
                  className={cn(
                    "h-9 w-9 shrink-0 rounded-xl transition-all duration-300",
                    input.trim()
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:scale-105 shadow-lg shadow-violet-900/40 text-white"
                      : "bg-white/[0.03] text-white/10"
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
