import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiCommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const suggestions = [
  "Summarize my unread emails",
  "What needs my attention?",
  "Draft a reply to the most recent email",
  "Find emails about finance",
];

export function AiCommandBar({ open, onOpenChange }: AiCommandBarProps) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);

  const commandMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("POST", "/api/ai/command", { prompt });
      return res.json();
    },
    onSuccess: (data) => {
      setResponse(data.response);
    },
  });

  const handleSubmit = (prompt: string) => {
    if (!prompt.trim()) return;
    setResponse(null);
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
        <DialogTitle className="sr-only">AI Command Bar</DialogTitle>
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

        <div className="max-h-[400px] overflow-y-auto">
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
              <div className="px-4 py-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Suggestions
                </span>
              </div>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    handleSubmit(suggestion);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm text-foreground/80",
                    "hover:bg-muted/50 transition-colors cursor-pointer",
                    "flex items-center gap-3"
                  )}
                  data-testid={`suggestion-${suggestion.slice(0, 20).replace(/\s/g, "-")}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {suggestion}
                </button>
              ))}
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
