import { useState, useRef, useEffect, useCallback } from "react";
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
  { label: "Inbox briefing", icon: Sparkles, prompt: "Give me a full Chief of Staff briefing on my inbox status, priorities, and recommended actions." },
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
  return html;
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
    onExpandChange?.(false);
  }, [onExpandChange]);

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

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-violet-900/40 hover:shadow-violet-700/50 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center group"
          data-testid="button-ai-chat-fab"
        >
          <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-gray-900" />
        </button>
      )}

      {isOpen && (<div
        className={cn(
          "fixed z-50",
          isFullscreen
            ? "inset-4 sm:inset-8"
            : "bottom-6 right-6 w-[380px] h-[560px] max-h-[calc(100vh-48px)]"
        )}
        data-testid="panel-ai-chat"
      >
        <div className={cn(
          "relative flex flex-col h-full overflow-hidden",
          "rounded-2xl border border-white/[0.08]",
          "bg-[#0a0a0f]/95 backdrop-blur-2xl",
          "shadow-2xl shadow-black/60"
        )}>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-violet-500/[0.03] to-transparent pointer-events-none" />
          <div className="absolute inset-[0] rounded-2xl ring-1 ring-inset ring-white/[0.05] pointer-events-none" />

          <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/95 leading-tight">
                  EOMail Chief of Staff
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-white/40">EOMail.co</span>
                  <span className="text-white/20">·</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400/80 font-medium">Connected</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {messages.length > 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white/30 hover:text-white/70 hover:bg-white/[0.06] rounded-lg"
                  onClick={clearChat}
                  data-testid="button-clear-chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white/30 hover:text-white/70 hover:bg-white/[0.06] rounded-lg"
                onClick={() => setIsFullscreen(!isFullscreen)}
                data-testid="button-fullscreen-chat"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white/30 hover:text-white/70 hover:bg-white/[0.06] rounded-lg"
                onClick={onToggle}
                data-testid="button-close-chat"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/[0.06] scrollbar-track-transparent">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/15 to-indigo-600/15 border border-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-violet-400/80" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-white/70">Your privatized AI assistant</p>
                  <p className="text-xs text-white/35 max-w-[240px] leading-relaxed">
                    Full agentic command of your eomail.co inbox — powered by three autonomous agents
                  </p>
                </div>

                <div className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/15 max-w-[280px]">
                  <p className="text-xs text-violet-200/80 leading-relaxed">
                    Hello! I'm your EOMail Chief of Staff. How can I help you manage your inbox today?
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-1.5 max-w-[340px] mt-1">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.prompt)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] text-[11px] text-white/55 hover:text-white/80 transition-all duration-150"
                      data-testid={`button-quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <action.icon className="w-3 h-3 shrink-0" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] text-[13px] leading-relaxed",
                    msg.role === "user"
                      ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white rounded-2xl rounded-br-md px-3.5 py-2.5 shadow-lg shadow-violet-900/20"
                      : "bg-white/[0.04] text-white/85 border border-white/[0.06] rounded-2xl rounded-bl-md px-3.5 py-2.5"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot className="w-3 h-3 text-violet-400" />
                      <span className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-wider">
                        Chief of Staff
                      </span>
                    </div>
                  )}
                  <div
                    className="whitespace-pre-wrap break-words [&_strong]:font-semibold [&_em]:italic [&_code]:text-violet-300 [&_li]:py-0.5"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                    <span className="text-xs text-white/40">Analyzing your inbox...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="relative px-3 py-3 shrink-0 border-t border-white/[0.04]">
            <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 focus-within:border-violet-500/30 focus-within:bg-white/[0.06] transition-all duration-200">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your inbox..."
                className="flex-1 bg-transparent border-0 outline-none text-[13px] text-white/85 placeholder:text-white/25 resize-none min-h-[20px] max-h-[80px]"
                rows={1}
                data-testid="input-ai-chat"
              />
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7 shrink-0 rounded-lg transition-all duration-200",
                  input.trim()
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-900/30"
                    : "text-white/20 hover:text-white/40 hover:bg-white/[0.06]"
                )}
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || chatMutation.isPending}
                data-testid="button-send-chat"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
