import { type Email } from "@shared/schema";
import { formatEmailTime, getInitials, getSenderColor, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmailDetailProps {
  email: Email | null;
  isLoading?: boolean;
  onBack: () => void;
  onStar: (id: string, starred: boolean) => void;
  onDelete: (id: string) => void;
  onReply: (email: Email) => void;
}

export function EmailDetail({ email, isLoading, onBack, onStar, onDelete, onReply }: EmailDetailProps) {
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

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="email-detail">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="md:hidden"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => onStar(email.id, !email.starred)} data-testid="button-star-detail">
              <Star className={cn("w-4 h-4", email.starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
            </Button>
            <Button size="icon" variant="ghost" data-testid="button-archive-detail">
              <Archive className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(email.id)}
              data-testid="button-delete-detail"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1">
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
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem>Add star</DropdownMenuItem>
              <DropdownMenuItem>Filter messages like this</DropdownMenuItem>
              <DropdownMenuItem>Mute</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-6 pb-4">
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
        </div>
      </div>

      <div className="px-6 py-4 border-t border-border shrink-0">
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
