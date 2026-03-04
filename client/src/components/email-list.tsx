import { type Email } from "@shared/schema";
import { formatEmailTime, getInitials, getSenderColor, cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Paperclip, Archive, Trash2, Clock } from "lucide-react";
import { useState } from "react";

interface EmailListProps {
  emails: Email[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (email: Email) => void;
  onStar: (id: string, starred: boolean) => void;
  onDelete: (id: string) => void;
  folder: string;
  search: string;
}

function highlightText(text: string, search: string): string {
  if (!search) return text;
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(regex, "<mark class='bg-yellow-200 dark:bg-yellow-800 rounded-sm'>$1</mark>");
}

export function EmailList({ emails, isLoading, selectedId, onSelect, onStar, onDelete, folder, search }: EmailListProps) {
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
          {search ? "No results found" : "Nothing here"}
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
    <div className="flex flex-col overflow-y-auto h-full">
      {emails.map((email) => {
        const isSelected = selectedId === email.id;
        const isHovered = hoveredId === email.id;
        const isChecked = checkedIds.has(email.id);
        const initials = getInitials(email.from);
        const avatarColor = getSenderColor(email.from);

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
                <div className="flex items-center gap-2 shrink-0">
                  {isHovered && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => onDelete(email.id)}
                        data-testid={`delete-email-${email.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
                  dangerouslySetInnerHTML={{ __html: highlightText(email.preview, search) }}
                />
                <div className="flex items-center gap-1 shrink-0">
                  {email.attachments > 0 && (
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
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
  );
}
