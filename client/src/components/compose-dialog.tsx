import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  X,
  Minimize2,
  Maximize2,
  Bold,
  Italic,
  Underline,
  Link,
  List,
  Paperclip,
  Smile,
  Trash2,
  Send,
} from "lucide-react";
import { type Email } from "@shared/schema";

interface ComposeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: ComposeData) => void;
  isSending: boolean;
  replyTo?: Email | null;
  prefill?: { to: string; subject: string; body: string } | null;
}

export interface ComposeData {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

export function ComposeDialog({ isOpen, onClose, onSend, isSending, replyTo, prefill }: ComposeDialogProps) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (replyTo) {
        setTo(replyTo.fromEmail);
        setSubject(`Re: ${replyTo.subject.replace(/^Re: /, "")}`);
        setBody("");
      } else if (prefill) {
        setTo(prefill.to);
        setSubject(prefill.subject);
        setBody(prefill.body);
      } else {
        setTo("");
        setSubject("");
        setBody("");
      }
      setCc("");
      setBcc("");
      setShowCc(false);
      setShowBcc(false);
      setMinimized(false);
      setMaximized(false);
    }
  }, [isOpen, replyTo, prefill]);

  const handleSend = () => {
    if (!to) return;
    onSend({ to, cc, bcc, subject, body });
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed z-50 bg-card border border-card-border shadow-2xl flex flex-col transition-all duration-200",
        maximized
          ? "inset-4 rounded-lg"
          : minimized
          ? "bottom-0 right-6 w-80 h-12 rounded-t-lg overflow-hidden"
          : "bottom-0 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-[520px] h-[500px] rounded-t-lg"
      )}
    >
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-t-lg cursor-pointer shrink-0"
        onClick={() => minimized && setMinimized(false)}
      >
        <span className="font-semibold text-sm text-foreground">
          {replyTo ? `Reply to: ${replyTo.from}` : "New Message"}
        </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setMinimized(!minimized)}
            data-testid="button-minimize-compose"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setMaximized(!maximized)}
            data-testid="button-maximize-compose"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onClose}
            data-testid="button-close-compose"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="flex flex-col border-b border-border shrink-0">
            <div className="flex items-center px-4 py-2 border-b border-border gap-2">
              <span className="text-xs text-muted-foreground w-12 shrink-0">To</span>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Recipients"
                className="border-0 shadow-none focus-visible:ring-0 text-sm h-7 px-0"
                data-testid="input-compose-to"
              />
              <div className="flex items-center gap-1 shrink-0">
                {!showCc && (
                  <button
                    className="text-xs text-primary font-medium"
                    onClick={() => setShowCc(true)}
                    data-testid="button-show-cc"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    className="text-xs text-primary font-medium ml-2"
                    onClick={() => setShowBcc(true)}
                    data-testid="button-show-bcc"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>
            {showCc && (
              <div className="flex items-center px-4 py-2 border-b border-border gap-2">
                <span className="text-xs text-muted-foreground w-12 shrink-0">Cc</span>
                <Input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="CC recipients"
                  className="border-0 shadow-none focus-visible:ring-0 text-sm h-7 px-0"
                  data-testid="input-compose-cc"
                />
              </div>
            )}
            {showBcc && (
              <div className="flex items-center px-4 py-2 border-b border-border gap-2">
                <span className="text-xs text-muted-foreground w-12 shrink-0">Bcc</span>
                <Input
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="BCC recipients"
                  className="border-0 shadow-none focus-visible:ring-0 text-sm h-7 px-0"
                  data-testid="input-compose-bcc"
                />
              </div>
            )}
            <div className="flex items-center px-4 py-2 border-b border-border gap-2">
              <span className="text-xs text-muted-foreground w-12 shrink-0">Subject</span>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="border-0 shadow-none focus-visible:ring-0 text-sm h-7 px-0"
                data-testid="input-compose-subject"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="flex-1 border-0 shadow-none focus-visible:ring-0 resize-none text-sm rounded-none min-h-0"
              data-testid="textarea-compose-body"
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0">
            <div className="flex items-center gap-1">
              <Button
                onClick={handleSend}
                disabled={isSending || !to}
                className="gap-2 rounded-full"
                size="sm"
                data-testid="button-send-email"
              >
                <Send className="w-3.5 h-3.5" />
                {isSending ? "Sending..." : "Send"}
              </Button>
              <div className="hidden md:flex items-center ml-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-compose-bold">
                  <Bold className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-compose-italic">
                  <Italic className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-compose-underline">
                  <Underline className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-compose-link">
                  <Link className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-compose-list">
                  <List className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-compose-attach">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-compose-emoji">
                  <Smile className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onClose}
              data-testid="button-compose-discard"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
