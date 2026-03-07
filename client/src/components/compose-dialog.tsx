import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Save,
} from "lucide-react";
import { type Email } from "@shared/schema";

interface ComposeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: ComposeData) => void;
  onSaveDraft: (data: ComposeData & { draftId?: string }) => void;
  onDiscardDraft: (draftId: string) => void;
  isSending: boolean;
  replyTo?: Email | null;
  prefill?: { to: string; subject: string; body: string } | null;
  editDraft?: Email | null;
}

export interface ComposeData {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/p><p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function ComposeDialog({ isOpen, onClose, onSend, onSaveDraft, onDiscardDraft, isSending, replyTo, prefill, editDraft }: ComposeDialogProps) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const toInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const isSendingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      isSendingRef.current = false;
      if (editDraft) {
        setTo(editDraft.toEmail);
        setSubject(editDraft.subject);
        setBody(stripHtml(editDraft.body));
        setCc(editDraft.cc || "");
        setBcc(editDraft.bcc || "");
        setShowCc(!!(editDraft.cc));
        setShowBcc(!!(editDraft.bcc));
        setDraftId(editDraft.id);
      } else if (replyTo) {
        setTo(replyTo.fromEmail);
        setSubject(`Re: ${replyTo.subject.replace(/^Re: /, "")}`);
        setBody("");
        setCc("");
        setBcc("");
        setShowCc(false);
        setShowBcc(false);
        setDraftId(undefined);
      } else if (prefill) {
        setTo(prefill.to);
        setSubject(prefill.subject);
        setBody(prefill.body);
        setCc("");
        setBcc("");
        setShowCc(false);
        setShowBcc(false);
        setDraftId(undefined);
      } else {
        setTo("");
        setSubject("");
        setBody("");
        setCc("");
        setBcc("");
        setShowCc(false);
        setShowBcc(false);
        setDraftId(undefined);
      }
      setMinimized(false);
      setMaximized(false);

      requestAnimationFrame(() => {
        if (editDraft) {
          bodyRef.current?.focus();
        } else if (replyTo) {
          bodyRef.current?.focus();
        } else if (prefill) {
          bodyRef.current?.focus();
        } else {
          toInputRef.current?.focus();
        }
      });
    }
  }, [isOpen, replyTo, prefill, editDraft]);

  const hasContent = to.trim() || subject.trim() || body.trim();

  const handleClose = useCallback(() => {
    if (isSendingRef.current) {
      onClose();
      return;
    }
    if (hasContent) {
      onSaveDraft({ to, cc, bcc, subject, body, draftId });
    }
    onClose();
  }, [to, cc, bcc, subject, body, draftId, hasContent, onSaveDraft, onClose]);

  const handleDiscard = useCallback(() => {
    isSendingRef.current = false;
    if (draftId) {
      onDiscardDraft(draftId);
    }
    onClose();
  }, [onClose, draftId, onDiscardDraft]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const handleSend = () => {
    if (!to) return;
    isSendingRef.current = true;
    onSend({ to, cc, bcc, subject, body });
  };

  const handleManualSaveDraft = () => {
    onSaveDraft({ to, cc, bcc, subject, body, draftId });
  };

  if (!isOpen) return null;

  return (
    <>
      {!minimized && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] md:hidden"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={replyTo ? `Reply to ${replyTo.from}` : editDraft ? "Edit draft" : "New message"}
        className={cn(
          "fixed z-50 bg-card border border-card-border shadow-2xl flex flex-col transition-all duration-200",
          "animate-in slide-in-from-bottom-4 fade-in duration-200",
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
          <span className="font-semibold text-sm text-foreground truncate mr-2">
            {replyTo ? `Reply to: ${replyTo.from}` : editDraft ? `Draft: ${editDraft.subject || "Untitled"}` : "New Message"}
          </span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setMinimized(!minimized)}
              aria-label={minimized ? "Expand" : "Minimize"}
              data-testid="button-minimize-compose"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setMaximized(!maximized)}
              aria-label={maximized ? "Restore" : "Maximize"}
              data-testid="button-maximize-compose"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={handleClose}
              aria-label="Close and save draft"
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
                <label htmlFor="compose-to" className="text-xs text-muted-foreground w-12 shrink-0">To</label>
                <Input
                  ref={toInputRef}
                  id="compose-to"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Recipients"
                  className="border-0 shadow-none focus-visible:ring-0 text-sm h-7 px-0"
                  data-testid="input-compose-to"
                />
                <div className="flex items-center gap-1 shrink-0">
                  {!showCc && (
                    <button
                      className="text-xs text-primary font-medium hover:underline"
                      onClick={() => setShowCc(true)}
                      data-testid="button-show-cc"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      className="text-xs text-primary font-medium ml-2 hover:underline"
                      onClick={() => setShowBcc(true)}
                      data-testid="button-show-bcc"
                    >
                      Bcc
                    </button>
                  )}
                </div>
              </div>
              {showCc && (
                <div className="flex items-center px-4 py-2 border-b border-border gap-2 animate-in slide-in-from-top-1 duration-150">
                  <label htmlFor="compose-cc" className="text-xs text-muted-foreground w-12 shrink-0">Cc</label>
                  <Input
                    id="compose-cc"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="CC recipients"
                    className="border-0 shadow-none focus-visible:ring-0 text-sm h-7 px-0"
                    autoFocus
                    data-testid="input-compose-cc"
                  />
                </div>
              )}
              {showBcc && (
                <div className="flex items-center px-4 py-2 border-b border-border gap-2 animate-in slide-in-from-top-1 duration-150">
                  <label htmlFor="compose-bcc" className="text-xs text-muted-foreground w-12 shrink-0">Bcc</label>
                  <Input
                    id="compose-bcc"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="BCC recipients"
                    className="border-0 shadow-none focus-visible:ring-0 text-sm h-7 px-0"
                    autoFocus
                    data-testid="input-compose-bcc"
                  />
                </div>
              )}
              <div className="flex items-center px-4 py-2 border-b border-border gap-2">
                <label htmlFor="compose-subject" className="text-xs text-muted-foreground w-12 shrink-0">Subject</label>
                <Input
                  id="compose-subject"
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
                ref={bodyRef}
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
                  className="gap-2 rounded-full active:scale-95 transition-transform"
                  size="sm"
                  data-testid="button-send-email"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? "Sending..." : "Send"}
                </Button>
                <div className="hidden md:flex items-center ml-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Bold" data-testid="button-compose-bold">
                    <Bold className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Italic" data-testid="button-compose-italic">
                    <Italic className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Underline" data-testid="button-compose-underline">
                    <Underline className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Insert link" data-testid="button-compose-link">
                    <Link className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="List" data-testid="button-compose-list">
                    <List className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Attach file" data-testid="button-compose-attach">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Insert emoji" data-testid="button-compose-emoji">
                    <Smile className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleManualSaveDraft}
                  aria-label="Save draft"
                  data-testid="button-save-draft"
                >
                  <Save className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleDiscard}
                  aria-label="Discard draft"
                  data-testid="button-compose-discard"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
