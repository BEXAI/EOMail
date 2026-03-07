import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bot,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  DollarSign,
  Calendar,
  Loader2,
  MessageSquare,
  Trash2,
} from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

interface AiChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onExpandChange?: (expanded: boolean) => void;
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

export function AiChatPanel({ isOpen, onToggle, onExpandChange }: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = useCallback(() => {
    const next = !isExpanded;
    setIsExpanded(next);
    onExpandChange?.(next);
  }, [isExpanded, onExpandChange]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const chatMutation = useMutation({
    mutationFn: async (newMessages: ChatMessage[]) => {
      const res = await apiRequest("POST", "/api/ai/chat", { messages: newMessages });
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

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex flex-col transition-all duration-300 ease-in-out",
        isExpanded ? "h-[33vh]" : "h-12"
      )}
      data-testid="panel-ai-chat"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/80 to-black/60 backdrop-blur-xl border-t border-white/10" />

      <div className="relative flex flex-col h-full">
        <div
          className="flex items-center justify-between px-4 py-2 cursor-pointer select-none shrink-0"
          onClick={toggleExpand}
          data-testid="button-toggle-chat-expand"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white/90">
              EOMail Chief of Staff
            </span>
            <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white/50 hover:text-white/80 hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  clearChat();
                }}
                data-testid="button-clear-chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white/50 hover:text-white/80 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white/50 hover:text-white/80 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              data-testid="button-close-chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white/70">Your privatized AI assistant</p>
                    <p className="text-xs text-white/40 mt-1">Full agentic command of your eomail.co inbox</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.prompt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs text-white/70 hover:text-white/90 transition-all"
                        data-testid={`button-quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <action.icon className="w-3 h-3" />
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
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-violet-600/80 text-white rounded-br-md"
                        : "bg-white/8 text-white/90 border border-white/10 rounded-bl-md"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bot className="w-3 h-3 text-violet-400" />
                        <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
                          Chief of Staff
                        </span>
                      </div>
                    )}
                    <div
                      className="whitespace-pre-wrap break-words [&_strong]:font-bold [&_em]:italic [&_code]:text-violet-300 [&_li]:py-0.5"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  </div>
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                      <span className="text-xs text-white/50">Analyzing your inbox...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 shrink-0">
              <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 focus-within:border-violet-500/50 focus-within:bg-white/8 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Command your inbox..."
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-white/90 placeholder:text-white/30 resize-none min-h-[20px] max-h-[80px]"
                  rows={1}
                  data-testid="input-ai-chat"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-7 w-7 shrink-0 rounded-full transition-all",
                    input.trim()
                      ? "bg-violet-600 hover:bg-violet-500 text-white"
                      : "text-white/30 hover:text-white/50 hover:bg-white/10"
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
        )}
      </div>
    </div>
  );
}
