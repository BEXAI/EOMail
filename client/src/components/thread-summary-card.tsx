import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Email, EmailThread } from "@shared/schema";
import { useDemoData } from "@/hooks/use-demo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  ChevronDown,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ThreadSummaryCardProps {
  threadId: string;
  isDemo?: boolean;
}

interface ThreadResponse {
  emails: Email[];
  summary: EmailThread | null;
}

export function ThreadSummaryCard({ threadId, isDemo }: ThreadSummaryCardProps) {
  const [showFullThread, setShowFullThread] = useState(false);
  const demoData = useDemoData(isDemo);

  const { data: liveThread, isLoading } = useQuery<ThreadResponse>({
    queryKey: ["/api/threads", threadId],
    enabled: !isDemo && !!threadId,
  });

  const demoSummary = demoData?.DEMO_THREAD_SUMMARIES.find((t) => t.id === threadId) || null;
  const demoEmails = (demoData?.DEMO_EMAILS ?? []).filter((e) => e.threadId === threadId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const summary = isDemo ? demoSummary : liveThread?.summary;
  const threadEmails = isDemo ? demoEmails : (liveThread?.emails || []);
  const participants = summary?.participants || [...new Set(threadEmails.map((e) => e.from))];

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4 mt-1" />
        </CardContent>
      </Card>
    );
  }

  if (!summary && threadEmails.length < 2) return null;

  return (
    <Collapsible>
      <Card className="mb-6 border-primary/20 overflow-hidden group">
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4 flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-violet-500" />
            </div>
            <div className="text-left flex-1">
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Thread Context</p>
              <p className="text-sm font-bold text-foreground">{summary?.subject || "Thread"}</p>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Badge variant="outline" className="text-[10px]">
                <MessageSquare className="w-2.5 h-2.5 mr-0.5" />
                {threadEmails.length} messages
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                <Users className="w-2.5 h-2.5 mr-0.5" />
                {participants.length}
              </Badge>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {summary?.digest && (
              <div className="bg-violet-500/5 rounded-xl p-3 border border-violet-500/10">
                <p className="text-sm text-foreground/90 leading-relaxed italic line-clamp-3">
                  "{summary.digest}"
                </p>
              </div>
            )}

            {summary?.keyPoints && summary.keyPoints.length > 0 && (
              <ul className="space-y-1 ml-1">
                {summary.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                    <span className="w-1 h-1 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            )}

            {threadEmails.length >= 2 && (
              <div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFullThread(!showFullThread); }}
                  className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showFullThread && "rotate-180")} />
                  {showFullThread ? "Hide" : "View"} full thread
                </button>

                {showFullThread && (
                  <div className="mt-2 space-y-2 border-l-2 border-violet-500/20 ml-1 pl-3">
                    {threadEmails.map((email, i) => (
                      <div key={email.id} className="text-xs">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-foreground">{email.from}</span>
                          <span className="text-muted-foreground">
                            {new Date(email.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-foreground/70 line-clamp-2">
                          {email.aiSummary || email.preview}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
