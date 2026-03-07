import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Loader2,
  MessageSquare,
  DollarSign,
  Calendar,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AiCommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandSuggestion {
  text: string;
  agent: string;
  icon: typeof Sparkles;
  color: string;
}

const suggestions: CommandSuggestion[] = [
  { text: "Summarize my unread emails", agent: "EOMail", icon: Sparkles, color: "text-purple-500" },
  { text: "What needs my attention?", agent: "EOMail", icon: Sparkles, color: "text-purple-500" },
  { text: "Show financial summary", agent: "FinOps", icon: DollarSign, color: "text-emerald-500" },
  { text: "Find recent receipts and invoices", agent: "FinOps", icon: DollarSign, color: "text-emerald-500" },
  { text: "What meetings are coming up?", agent: "Chrono", icon: Calendar, color: "text-blue-500" },
  { text: "Schedule a meeting this week", agent: "Chrono", icon: Calendar, color: "text-blue-500" },
  { text: "Show blocked threats", agent: "Aegis", icon: Shield, color: "text-red-500" },
  { text: "Review quarantined emails", agent: "Aegis", icon: Shield, color: "text-red-500" },
];

const HISTORY_KEY = "eomail-command-history";

function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]").slice(0, 5);
  } catch {
    return [];
  }
}

function addToHistory(command: string) {
  const history = getHistory().filter(h => h !== command);
  history.unshift(command);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 5)));
}

export function AiCommandBar({ open, onOpenChange }: AiCommandBarProps) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setHistory(getHistory());
    }
  }, [open]);

  const commandMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("POST", "/api/ai/command", { prompt });
      return res.json();
    },
    onSuccess: (data) => {
      setResponse(data.response);
    },
    onError: () => {
      setResponse("Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (prompt: string) => {
    if (!prompt.trim()) return;
    setResponse(null);
    addToHistory(prompt.trim());
    setHistory(getHistory());
    commandMutation.mutate(prompt.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setInput("");
      setResponse(null);
      commandMutation.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden" data-testid="ai-command-bar">
        <DialogTitle className="sr-only">AI Action Center</DialogTitle>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI about your inbox..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            autoFocus
            data-testid="input-ai-command"
          />
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {commandMutation.isPending && (
            <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground" data-testid="ai-command-loading">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}

          {response && (
            <div className="px-4 py-4 border-b border-border" data-testid="ai-command-response">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {response}
                </p>
              </div>
            </div>
          )}

          {!commandMutation.isPending && !response && (
            <div className="py-2">
              {history.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Recent
                    </span>
                  </div>
                  {history.map((cmd, i) => (
                    <button
                      key={`history-${i}`}
                      onClick={() => {
                        setInput(cmd);
                        handleSubmit(cmd);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm text-foreground/60",
                        "hover:bg-muted/50 transition-colors cursor-pointer",
                        "flex items-center gap-3"
                      )}
                      data-testid={`history-${i}`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      <span className="truncate">{cmd}</span>
                    </button>
                  ))}
                  <div className="border-b border-border mx-4 my-1" />
                </div>
              )}

              <div className="px-4 py-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Agent Commands
                </span>
              </div>
              {suggestions.map((suggestion) => {
                const Icon = suggestion.icon;
                return (
                  <button
                    key={suggestion.text}
                    onClick={() => {
                      setInput(suggestion.text);
                      handleSubmit(suggestion.text);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm text-foreground/80",
                      "hover:bg-muted/50 transition-colors cursor-pointer",
                      "flex items-center gap-3"
                    )}
                    data-testid={`suggestion-${suggestion.text.slice(0, 20).replace(/\s/g, "-")}`}
                  >
                    <Icon className={cn("w-3.5 h-3.5 shrink-0", suggestion.color)} />
                    <span className="flex-1">{suggestion.text}</span>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">{suggestion.agent}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Press <kbd className="bg-muted px-1 py-0.5 rounded text-xs font-mono">Enter</kbd> to send
          </span>
          <span className="text-xs text-muted-foreground">
            <kbd className="bg-muted px-1 py-0.5 rounded text-xs font-mono">Esc</kbd> to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
