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
  "EOMail Assistant": { icon: Sparkles, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900" },
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
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin" data-testid="morning-briefing">
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="text-center mb-10">
          <div className="relative group mx-auto w-24 h-24 mb-6">
            <div className="absolute -inset-2 bg-gradient-to-tr from-primary to-indigo-600 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative w-full h-full rounded-3xl bg-[#0a0a0f] border border-white/10 flex items-center justify-center shadow-2xl">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase italic" data-testid="briefing-greeting">
            {greeting}, {firstName}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="h-px w-6 bg-white/10" />
            <p className="text-[10px] font-black text-primary tracking-[0.3em] uppercase">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <span className="h-px w-6 bg-white/10" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Inbox Queue", value: unreadCount, icon: Mail, color: "text-blue-400", glow: "shadow-blue-500/10" },
            { label: "AI Synthesized", value: aiProcessedCount, icon: Brain, color: "text-violet-400", glow: "shadow-violet-500/10" },
            { label: "Action Pending", value: pendingCount, icon: ClipboardCheck, color: "text-emerald-400", glow: "shadow-emerald-500/10" }
          ].map((stat) => (
            <Card key={stat.label} className={cn("eomail-glass border-white/5 bg-white/[0.02] shadow-xl", stat.glow)}>
              <CardContent className="p-5 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mb-3 border border-white/5">
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div className="text-3xl font-black text-white mb-1" data-testid={`stat-${stat.label.toLowerCase().split(' ')[0]}`}>{stat.value}</div>
                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="eomail-card p-0.5 mt-8 border-primary/20 shadow-2xl shadow-primary/5">
          <CardContent className="p-8 bg-gradient-to-br from-primary/[0.08] to-transparent rounded-[1.75rem]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.3)] border border-primary/30">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <span className="text-xs font-black tracking-[0.2em] text-primary uppercase">Gemini 3 Intelligent Assistant</span>
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5 self-start">Optimized Intelligence // System v3.0</p>
              </div>
              <Badge variant="outline" className="ml-auto text-[9px] font-black border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                Live Analysis
              </Badge>
            </div>
            {briefingLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full bg-white/5 rounded-full" />
                <Skeleton className="h-4 w-5/6 bg-white/5 rounded-full" />
                <Skeleton className="h-4 w-3/4 bg-white/5 rounded-full" />
              </div>
            ) : (
              <div className="relative">
                <p className="text-lg text-white/90 leading-relaxed font-semibold pr-4" data-testid="briefing-text">
                  {briefingData?.briefing || "Enable AI tools to analyze your inbox and generate smart briefings."}
                </p>
                <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-[#0a0a0f] to-transparent pointer-events-none" />
              </div>
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
                const config = agentIcons[agent.name] || agentIcons["EOMail Assistant"];
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
                  role="button"
                  tabIndex={0}
                  className="border-border cursor-pointer hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 outline-none"
                  onClick={() => onSelectEmail(email)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectEmail(email); } }}
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
