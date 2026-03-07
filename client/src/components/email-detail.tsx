import { type Email } from "@shared/schema";
import { getInitials, getSenderColor, cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  Paperclip,
  Printer,
  ChevronDown,
  FolderInput,
  Inbox,
  AlertTriangle,
  Mail,
  MailOpen,
  Sparkles,
  Brain,
  Shield,
  ShieldAlert,
  Check,
  Pencil,
  X,
  Loader2,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmailDetailProps {
  email: Email | null;
  isLoading?: boolean;
  onBack: () => void;
  onStar: (id: string, starred: boolean) => void;
  onDelete: (id: string) => void;
  onReply: (email: Email) => void;
  onMarkRead: (id: string, read: boolean) => void;
  onMove: (id: string, folder: string) => void;
  onArchive: (id: string) => void;
  onCompose?: (prefill: { to: string; subject: string; body: string }) => void;
}

const urgencyColors: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-400", label: "High" },
  medium: { bg: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-400", label: "Medium" },
  low: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-400", label: "Low" },
};

const categoryIcons: Record<string, string> = {
  finance: "💰",
  scheduling: "📅",
  newsletter: "📰",
  "action-required": "⚡",
  social: "👋",
  notification: "🔔",
};

export function EmailDetail({ email, isLoading, onBack, onStar, onDelete, onReply, onMarkRead, onMove, onArchive, onCompose }: EmailDetailProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const processEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/ai/process/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/activity"] });
      toast({ title: "AI analysis complete" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/ai/approve/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
      toast({ title: "Reply sent", description: "AI draft reply has been approved and sent." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/ai/reject/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
      toast({ title: "Draft rejected", description: "AI draft reply has been discarded." });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6 gap-4">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-8 h-8 rounded-md" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 py-24">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
          <Reply className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Select an email to read</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Choose an email from the list to view its contents here.
        </p>
      </div>
    );
  }

  const initials = getInitials(email.from);
  const avatarColor = getSenderColor(email.from);
  const showSpamWarning = email.aiSpamScore !== null && email.aiSpamScore > 70;
  const urgency = urgencyColors[email.aiUrgency || "low"];

  const handleSuggestedAction = () => {
    if (!email.aiSuggestedAction) return;
    switch (email.aiSuggestedAction) {
      case "archive":
        onArchive(email.id);
        break;
      case "reply":
        onReply(email);
        break;
      case "flag":
        onStar(email.id, true);
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="email-detail">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => onStar(email.id, !email.starred)} data-testid="button-star-detail">
              <Star className={cn("w-4 h-4", email.starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onArchive(email.id)} data-testid="button-archive-detail" title="Archive">
              <Archive className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(email.id)}
              data-testid="button-delete-detail"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMarkRead(email.id, !email.read)}
              data-testid="button-toggle-read-detail"
              title={email.read ? "Mark as unread" : "Mark as read"}
            >
              {email.read ? <Mail className="w-4 h-4 text-muted-foreground" /> : <MailOpen className="w-4 h-4 text-muted-foreground" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid="button-move-detail" title="Move to">
                  <FolderInput className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onMove(email.id, "inbox")} data-testid="detail-move-inbox">
                  <Inbox className="w-3.5 h-3.5 mr-2" /> Move to Inbox
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchive(email.id)} data-testid="detail-move-archive">
                  <Archive className="w-3.5 h-3.5 mr-2" /> Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMove(email.id, "spam")} data-testid="detail-move-spam">
                  <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Report Spam
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(email.id)} data-testid="detail-move-trash">
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Move to Trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!email.aiProcessed && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => processEmailMutation.mutate(email.id)}
              disabled={processEmailMutation.isPending}
              className="gap-1.5 text-xs"
              data-testid="button-analyze-ai"
            >
              {processEmailMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Brain className="w-3.5 h-3.5" />
              )}
              Analyze with AI
            </Button>
          )}
          <Button size="icon" variant="ghost" data-testid="button-print">
            <Printer className="w-4 h-4 text-muted-foreground" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-more-options">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onMarkRead(email.id, !email.read)} data-testid="menu-toggle-read">
                {email.read ? "Mark as unread" : "Mark as read"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStar(email.id, !email.starred)}>
                {email.starred ? "Remove star" : "Add star"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Filter messages like this</DropdownMenuItem>
              <DropdownMenuItem>Mute</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 md:px-6 pt-6 pb-4">
          {showSpamWarning && (
            <Card className="mb-4 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50" data-testid="gatekeeper-warning">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-red-700 dark:text-red-400 text-sm">
                        Aegis Gatekeeper Warning
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        {email.aiSpamScore}% Risk
                      </Badge>
                    </div>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80">
                      {email.aiSpamReason}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => onMove(email.id, "inbox")}
                        data-testid="button-trust-anyway"
                      >
                        <Shield className="w-3 h-3 mr-1" /> Trust Anyway
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs"
                        onClick={() => onDelete(email.id)}
                        data-testid="button-report-delete"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Report & Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {email.aiProcessed && (
            <Collapsible defaultOpen>
              <Card className="mb-4 border-border bg-muted/30" data-testid="ai-insights-card">
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-3 flex items-center gap-2 cursor-pointer">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">AI Insights</span>
                    {email.aiUrgency && urgency && (
                      <Badge className={cn("text-xs ml-auto", urgency.bg, urgency.text)} variant="secondary">
                        {urgency.label} Urgency
                      </Badge>
                    )}
                    {email.aiCategory && (
                      <Badge variant="outline" className="text-xs">
                        {categoryIcons[email.aiCategory] || "📧"} {email.aiCategory}
                      </Badge>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-3">
                    {email.aiSummary && (
                      <div className="bg-primary/5 rounded-md p-3">
                        <p className="text-sm text-foreground/80" data-testid="ai-summary">
                          {email.aiSummary}
                        </p>
                      </div>
                    )}
                    {email.aiSuggestedAction && (
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-xs text-muted-foreground">AI suggests:</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-6 px-2"
                          onClick={handleSuggestedAction}
                          data-testid="button-suggested-action"
                        >
                          {email.aiSuggestedAction.charAt(0).toUpperCase() + email.aiSuggestedAction.slice(1)}
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          <h1 className="text-2xl font-semibold text-foreground mb-4 leading-tight" data-testid="email-subject-detail">
            {email.subject}
          </h1>

          {email.labels.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {email.labels.map((label) => (
                <Badge key={label} variant="secondary" className="text-xs" data-testid={`detail-label-${label}`}>
                  {label}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-start gap-3 mb-4">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold",
                avatarColor
              )}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <span className="font-semibold text-foreground text-sm" data-testid="email-sender-detail">
                    {email.from}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">&lt;{email.fromEmail}&gt;</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid="email-date-detail">
                  {new Date(email.timestamp).toLocaleString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-muted-foreground">to {email.to}</span>
                <button className="inline-flex">
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          <Separator className="mb-6" />

          <div
            className="prose prose-sm max-w-none text-foreground [&_p]:mb-3 [&_ul]:mb-3 [&_ol]:mb-3 [&_li]:mb-1 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: email.body }}
            data-testid="email-body"
          />

          {email.attachments > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {email.attachments} attachment{email.attachments > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: email.attachments }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 hover-elevate cursor-pointer"
                    data-testid={`attachment-${i}`}
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                      <Paperclip className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Document_{i + 1}.pdf</p>
                      <p className="text-xs text-muted-foreground">245 KB</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {email.aiDraftReply && (
            <Card className="mt-6 border-primary/30 bg-primary/5" data-testid="pending-approval-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">AI Draft Reply — Pending Your Approval</span>
                </div>
                <div className="bg-background rounded-md p-3 mb-4 border border-border">
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap" data-testid="ai-draft-reply-text">
                    {email.aiDraftReply}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(email.id)}
                    disabled={approveMutation.isPending}
                    className="gap-1.5"
                    data-testid="button-approve-send"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Approve & Send
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (onCompose) {
                        onCompose({
                          to: email.fromEmail,
                          subject: `Re: ${email.subject}`,
                          body: email.aiDraftReply!,
                        });
                      }
                    }}
                    className="gap-1.5"
                    data-testid="button-edit-draft"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => rejectMutation.mutate(email.id)}
                    disabled={rejectMutation.isPending}
                    className="gap-1.5 text-muted-foreground"
                    data-testid="button-reject-draft"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="px-4 md:px-6 py-4 border-t border-border shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => onReply(email)}
            className="gap-2"
            data-testid="button-reply"
          >
            <Reply className="w-4 h-4" />
            Reply
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-reply-all">
            <ReplyAll className="w-4 h-4" />
            Reply all
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-forward">
            <Forward className="w-4 h-4" />
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}
