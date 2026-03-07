import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Email } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Mail,
  Brain,
  ClipboardCheck,
  Loader2,
  ArrowRight,
  Zap,
  DollarSign,
  Calendar,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MorningBriefingProps {
  userName?: string;
  emails: Email[];
  onSelectEmail: (email: Email) => void;
}

interface BriefingData {
  briefing: string;
  agentStats?: { name: string; completed: number; pending: number }[];
}

const agentIcons: Record<string, { icon: typeof DollarSign; color: string; bgColor: string }> = {
  "FinOps Auto-Resolver": { icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900" },
  "Chrono-Logistics Coordinator": { icon: Calendar, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900" },
  "Aegis Gatekeeper": { icon: Shield, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900" },
  "AIMAIL Assistant": { icon: Sparkles, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900" },
};

export function MorningBriefing({ userName, emails, onSelectEmail }: MorningBriefingProps) {
  const queryClient = useQueryClient();
  const firstName = userName?.split(" ")[0] || "there";

  const { data: briefingData, isLoading: briefingLoading } = useQuery<BriefingData>({
    queryKey: ["/api/ai/briefing"],
  });

  const processAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/process-all");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/briefing"] });
    },
  });

  const unreadCount = emails.filter((e) => !e.read).length;
  const aiProcessedCount = emails.filter((e) => e.aiProcessed).length;
  const pendingCount = emails.filter((e) => e.aiDraftReply).length;
  const unprocessedCount = emails.filter((e) => !e.aiProcessed).length;

  const urgentEmails = emails
    .filter((e) => e.aiUrgency === "high" || e.aiSuggestedAction === "reply")
    .slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const urgencyColors: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  const agentStats = briefingData?.agentStats || [];

  return (
    <div className="flex flex-col h-full overflow-y-auto" data-testid="morning-briefing">
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 border border-primary/10">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="briefing-greeting">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5 italic">
            From Inbox Zero → Zero Time Spent
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <Mail className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground" data-testid="stat-unread">{unreadCount}</div>
              <div className="text-xs text-muted-foreground">Unread emails</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <Brain className="w-5 h-5 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground" data-testid="stat-processed">{aiProcessedCount}</div>
              <div className="text-xs text-muted-foreground">AI processed</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <ClipboardCheck className="w-5 h-5 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground" data-testid="stat-pending">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pending approval</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Chief of Staff Briefing</span>
            </div>
            {briefingLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : (
              <p className="text-sm text-foreground/80 leading-relaxed" data-testid="briefing-text">
                {briefingData?.briefing || "Process your emails with AI to get your morning briefing."}
              </p>
            )}
          </CardContent>
        </Card>

        {agentStats.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              Agent Activity Summary
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {agentStats.filter(a => a.completed > 0 || a.pending > 0).map((agent) => {
                const config = agentIcons[agent.name] || agentIcons["AIMAIL Assistant"];
                const AgentIcon = config.icon;
                return (
                  <Card key={agent.name} className="border-border">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.bgColor)}>
                        <AgentIcon className={cn("w-4 h-4", config.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{agent.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {agent.completed} completed{agent.pending > 0 ? `, ${agent.pending} active` : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {unprocessedCount > 0 && (
          <Button
            onClick={() => processAllMutation.mutate()}
            disabled={processAllMutation.isPending}
            className="w-full gap-2"
            size="lg"
            data-testid="button-process-all"
          >
            {processAllMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing {unprocessedCount} emails...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Process All with AI ({unprocessedCount} emails)
              </>
            )}
          </Button>
        )}

        {urgentEmails.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              Needs Your Attention
            </h3>
            <div className="space-y-2">
              {urgentEmails.map((email) => (
                <Card
                  key={email.id}
                  className="border-border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onSelectEmail(email)}
                  data-testid={`urgent-email-${email.id}`}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        urgencyColors[email.aiUrgency || "low"]
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-foreground truncate">
                          {email.from}
                        </span>
                        {email.aiCategory && (
                          <Badge variant="secondary" className="text-xs py-0 shrink-0">
                            {email.aiCategory}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {email.aiSummary || email.preview}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">⌘K</kbd> to open AI Action Center
          </p>
        </div>
      </div>
    </div>
  );
}
