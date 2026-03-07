import { type Email } from "@shared/schema";
import { formatEmailTime, getInitials, getSenderColor, cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  Paperclip,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  FolderInput,
  Inbox,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

interface EmailListProps {
  emails: Email[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (email: Email) => void;
  onStar: (id: string, starred: boolean) => void;
  onDelete: (id: string) => void;
  onMarkRead: (id: string, read: boolean) => void;
  onMove: (id: string, folder: string) => void;
  onArchive: (id: string) => void;
  onBulkAction: (ids: string[], action: string) => void;
  folder: string;
  search: string;
  labelFilter: string | null;
}

function highlightText(text: string, search: string): string {
  if (!search) return text;
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(regex, "<mark class='bg-yellow-200 dark:bg-yellow-800 rounded-sm'>$1</mark>");
}

const urgencyDotColors: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const categoryColors: Record<string, string> = {
  finance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  scheduling: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  newsletter: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  "action-required": "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  social: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
  notification: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
};

export function EmailList({
  emails,
  isLoading,
  selectedId,
  onSelect,
  onStar,
  onDelete,
  onMarkRead,
  onMove,
  onArchive,
  onBulkAction,
  folder,
  search,
  labelFilter,
}: EmailListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (checkedIds.size === emails.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(emails.map((e) => e.id)));
    }
  };

  const handleBulkAction = (action: string) => {
    const ids = Array.from(checkedIds);
    onBulkAction(ids, action);
    setCheckedIds(new Set());
  };

  const hasChecked = checkedIds.size > 0;
  const allChecked = emails.length > 0 && checkedIds.size === emails.length;

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Skeleton className="w-5 h-5 rounded-sm shrink-0" />
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-14" />
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
          <Archive className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {search ? "No results found" : labelFilter ? "No emails with this label" : "Nothing here"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {search
            ? `No emails match "${search}". Try a different search term.`
            : `Your ${folder} is empty.`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {hasChecked && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/50 shrink-0" data-testid="bulk-actions-bar">
          <Checkbox
            checked={allChecked}
            onCheckedChange={toggleSelectAll}
            className="w-4 h-4"
            data-testid="checkbox-select-all"
          />
          <span className="text-xs text-muted-foreground mr-2">
            {checkedIds.size} selected
          </span>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleBulkAction("delete")} data-testid="bulk-delete">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleBulkAction("read")} data-testid="bulk-mark-read">
            <MailOpen className="w-3.5 h-3.5" /> Read
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleBulkAction("unread")} data-testid="bulk-mark-unread">
            <Mail className="w-3.5 h-3.5" /> Unread
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleBulkAction("star")} data-testid="bulk-star">
            <Star className="w-3.5 h-3.5" /> Star
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleBulkAction("archive")} data-testid="bulk-archive">
            <Archive className="w-3.5 h-3.5" /> Archive
          </Button>
        </div>
      )}

      {!hasChecked && (
        <div className="flex items-center px-4 py-1.5 border-b border-border shrink-0">
          <Checkbox
            checked={false}
            onCheckedChange={toggleSelectAll}
            className="w-4 h-4"
            data-testid="checkbox-select-all"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {emails.map((email) => {
          const isSelected = selectedId === email.id;
          const isHovered = hoveredId === email.id;
          const isChecked = checkedIds.has(email.id);
          const initials = getInitials(email.from);
          const avatarColor = getSenderColor(email.from);
          const previewText = email.aiSummary || email.preview;

          return (
            <div
              key={email.id}
              onClick={() => onSelect(email)}
              onMouseEnter={() => setHoveredId(email.id)}
              onMouseLeave={() => setHoveredId(null)}
              data-testid={`email-item-${email.id}`}
              className={cn(
                "flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border transition-colors relative group",
                isSelected
                  ? "bg-primary/8 border-l-[3px] border-l-primary"
                  : !email.read
                  ? "bg-background"
                  : "bg-muted/30",
                isHovered && !isSelected && "bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2 mt-1 shrink-0">
                <div
                  onClick={(e) => toggleCheck(email.id, e)}
                  className={cn(
                    "w-5 h-5 transition-opacity",
                    isChecked || isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    className="w-4 h-4"
                    data-testid={`checkbox-email-${email.id}`}
                  />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onStar(email.id, !email.starred); }}
                  className={cn(
                    "shrink-0 transition-all",
                    email.starred ? "text-amber-400" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                  )}
                  data-testid={`star-email-${email.id}`}
                >
                  <Star className={cn("w-4 h-4", email.starred && "fill-amber-400")} />
                </button>
              </div>

              {email.aiProcessed && email.aiUrgency && (
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0 mt-3",
                    urgencyDotColors[email.aiUrgency]
                  )}
                  title={`${email.aiUrgency} urgency`}
                  data-testid={`urgency-${email.id}`}
                />
              )}

              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold mt-0.5",
                  avatarColor
                )}
              >
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span
                    className={cn(
                      "text-sm truncate",
                      !email.read ? "font-bold text-foreground" : "font-medium text-foreground/80"
                    )}
                    data-testid={`sender-${email.id}`}
                    dangerouslySetInnerHTML={{ __html: highlightText(email.from, search) }}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    {isHovered && (
                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => onArchive(email.id)}
                          data-testid={`archive-email-${email.id}`}
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => onDelete(email.id)}
                          data-testid={`delete-email-${email.id}`}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => onMarkRead(email.id, !email.read)}
                          data-testid={`toggle-read-${email.id}`}
                          title={email.read ? "Mark unread" : "Mark read"}
                        >
                          {email.read ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              data-testid={`move-email-${email.id}`}
                              title="Move to"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onMove(email.id, "inbox")} data-testid={`move-to-inbox-${email.id}`}>
                              <Inbox className="w-3.5 h-3.5 mr-2" /> Inbox
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onArchive(email.id)} data-testid={`move-to-archive-${email.id}`}>
                              <Archive className="w-3.5 h-3.5 mr-2" /> Archive
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onMove(email.id, "spam")} data-testid={`move-to-spam-${email.id}`}>
                              <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Spam
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(email.id)} data-testid={`move-to-trash-${email.id}`}>
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Trash
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    <span className={cn("text-xs whitespace-nowrap", !email.read ? "font-semibold text-foreground" : "text-muted-foreground")}>
                      {formatEmailTime(email.timestamp)}
                    </span>
                  </div>
                </div>

                <div
                  className={cn("text-sm truncate mb-0.5", !email.read ? "font-semibold text-foreground" : "text-foreground/70")}
                  dangerouslySetInnerHTML={{ __html: highlightText(email.subject, search) }}
                  data-testid={`subject-${email.id}`}
                />

                <div className="flex items-center gap-2">
                  <span
                    className="text-xs text-muted-foreground truncate flex-1"
                    dangerouslySetInnerHTML={{ __html: highlightText(previewText, search) }}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    {email.aiDraftReply && (
                      <Sparkles className="w-3 h-3 text-primary" />
                    )}
                    {email.attachments > 0 && (
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    {email.aiCategory && (
                      <Badge
                        variant="secondary"
                        className={cn("text-xs py-0 px-1.5 h-4 border-0", categoryColors[email.aiCategory])}
                        data-testid={`ai-category-${email.id}`}
                      >
                        {email.aiCategory}
                      </Badge>
                    )}
                    {email.labels.map((label) => (
                      <Badge
                        key={label}
                        variant="secondary"
                        className="text-xs py-0 px-1.5 h-4"
                        data-testid={`label-${email.id}-${label}`}
                      >
                        {label}
                      </Badge>
                    ))}
                    {!email.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
