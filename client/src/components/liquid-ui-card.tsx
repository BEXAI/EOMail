import { type Email } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Archive,
  DollarSign,
  Calendar,
  Newspaper,
  Clock,
  FileText,
  Zap,
  Star,
  Reply,
  X,
} from "lucide-react";

const categoryIcons: Record<string, string> = {
  finance: "💰",
  scheduling: "📅",
  newsletter: "📰",
  "action-required": "⚡",
  social: "👋",
  notification: "🔔",
};

export function LiquidUICard({ email, onArchive, onReply }: { email: Email; onArchive: (id: string) => void; onReply: (email: Email) => void; }) {
  const category = email.aiCategory;
  if (!category || !email.aiProcessed) return null;

  if (category === "finance") {
    const amounts = email.body.replace(/<[^>]*>/g, "").match(/\$[\d,]+\.?\d*/g) || [];
    return (
      <Card className="mt-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30" data-testid="liquid-ui-finance">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">FinOps Auto-Resolver</span>
              <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1.5 h-4 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 border-0">
                Level 4 Autonomy
              </Badge>
            </div>
          </div>
          {amounts.length > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {amounts.map((amount, i) => (
                <span key={i} className="text-lg font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 rounded-md">
                  {amount}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1.5 border-emerald-300 dark:border-emerald-700 opacity-50 cursor-not-allowed" disabled title="Coming soon" data-testid="button-log-accounting">
              <FileText className="w-3 h-3" /> Log to Accounting
            </Button>
            <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={() => onArchive(email.id)} data-testid="button-auto-archive">
              <Archive className="w-3 h-3" /> Auto-Archive
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (category === "scheduling") {
    return (
      <Card className="mt-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30" data-testid="liquid-ui-scheduling">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">Chrono-Logistics Coordinator</span>
              <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1.5 h-4 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-400 border-0">
                Level 4 Autonomy
              </Badge>
            </div>
          </div>
          <div className="bg-blue-100/50 dark:bg-blue-900/30 rounded-md p-3 mb-3">
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">Meeting request detected</span>
            </div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
              {email.aiSummary || "Calendar event detected in this email."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1.5 border-blue-300 dark:border-blue-700" data-testid="button-accept-calendar">
              <Calendar className="w-3 h-3" /> Accept & Add to Calendar
            </Button>
            <Button size="sm" variant="ghost" className="text-xs gap-1.5 opacity-50 cursor-not-allowed" disabled title="Coming soon" data-testid="button-suggest-alternatives">
              <Clock className="w-3 h-3" /> Suggest Alternatives
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (category === "newsletter") {
    return (
      <Card className="mt-4 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30" data-testid="liquid-ui-newsletter">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-sm font-semibold text-foreground">Newsletter Summary</span>
          </div>
          {email.aiSummary && (
            <div className="bg-gray-100/50 dark:bg-gray-800/30 rounded-md p-3 mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Key Takeaways</p>
              <p className="text-sm text-foreground/80">{email.aiSummary}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={() => onArchive(email.id)} data-testid="button-archive-newsletter">
              <Archive className="w-3 h-3" /> Archive
            </Button>
            <Button size="sm" variant="ghost" className="text-xs gap-1.5 text-muted-foreground opacity-50 cursor-not-allowed" disabled title="Coming soon" data-testid="button-unsubscribe">
              <X className="w-3 h-3" /> Unsubscribe
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (category === "action-required") {
    return (
      <Card className="mt-4 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30" data-testid="liquid-ui-action">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-semibold text-foreground">Action Required</span>
            {email.aiUrgency === "high" && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4">Urgent</Badge>
            )}
          </div>
          {email.aiSummary && (
            <p className="text-sm text-foreground/80 mb-3">{email.aiSummary}</p>
          )}
          <div className="flex items-center gap-2">
            {email.aiSuggestedAction === "reply" && (
              <Button size="sm" variant="outline" className="text-xs gap-1.5 border-orange-300 dark:border-orange-700" onClick={() => onReply(email)} data-testid="button-quick-reply">
                <Reply className="w-3 h-3" /> Quick Reply
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-xs gap-1.5 opacity-50 cursor-not-allowed" disabled title="Coming soon" data-testid="button-flag-action">
              <Star className="w-3 h-3" /> Flag for Later
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
