import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QuarantineAction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { DEMO_QUARANTINE_ACTIONS } from "@/lib/demo-data";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Unlock,
  Trash2,
  Link2,
  Globe,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AegisSecurityPanelProps {
  isDemo?: boolean;
}

export function AegisSecurityPanel({ isDemo }: AegisSecurityPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: liveQuarantine = [], isLoading } = useQuery<QuarantineAction[]>({
    queryKey: ["/api/security/quarantine"],
    enabled: !isDemo,
  });

  const quarantine = isDemo ? DEMO_QUARANTINE_ACTIONS : liveQuarantine;

  const releaseMutation = useMutation({
    mutationFn: async (emailId: string) => {
      await apiRequest("POST", `/api/security/quarantine/${emailId}/release`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security/quarantine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
      toast({ title: "Email released from quarantine" });
    },
  });

  const quarantined = quarantine.filter((q) => q.releaseStatus === "quarantined");
  const released = quarantine.filter((q) => q.releaseStatus === "released");
  const totalBlocked = quarantine.length;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6 gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Security Dashboard</h1>
            <p className="text-xs text-muted-foreground">Aegis Gatekeeper threat detection & quarantine</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{quarantined.length}</p>
              <p className="text-xs text-muted-foreground">Quarantined</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{released.length}</p>
              <p className="text-xs text-muted-foreground">Released</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{totalBlocked}</p>
              <p className="text-xs text-muted-foreground">Total Threats</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-3">
        {quarantine.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldCheck className="w-12 h-12 text-green-500/40 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">All Clear</p>
            <p className="text-xs text-muted-foreground">No threats detected. Your inbox is secure.</p>
          </div>
        ) : (
          quarantine.map((action) => (
            <QuarantineCard
              key={action.id}
              action={action}
              onRelease={() => releaseMutation.mutate(action.emailId)}
              isReleasing={releaseMutation.isPending}
              isDemo={isDemo}
            />
          ))
        )}
      </div>
    </div>
  );
}

function QuarantineCard({
  action,
  onRelease,
  isReleasing,
  isDemo,
}: {
  action: QuarantineAction;
  onRelease: () => void;
  isReleasing: boolean;
  isDemo?: boolean;
}) {
  const scoreColor =
    action.threatScore >= 80
      ? "text-red-500"
      : action.threatScore >= 50
        ? "text-orange-500"
        : "text-yellow-500";

  const scoreBarColor =
    action.threatScore >= 80
      ? "bg-red-500"
      : action.threatScore >= 50
        ? "bg-orange-500"
        : "bg-yellow-500";

  const isQuarantined = action.releaseStatus === "quarantined";

  return (
    <Card className={cn(isQuarantined && "border-red-200 dark:border-red-900")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className={cn("w-4 h-4", scoreColor)} />
            <div>
              <Badge className="text-[10px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" variant="secondary">
                {action.threatType}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("text-lg font-bold", scoreColor)}>{action.threatScore}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>

        <div className="w-full h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", scoreBarColor)} style={{ width: `${action.threatScore}%` }} />
        </div>

        {action.quarantineReason && (
          <p className="text-xs text-foreground/70 mb-3">{action.quarantineReason}</p>
        )}

        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer mb-2">
            <ChevronDown className="w-3 h-3" />
            Technical details
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs">
              {action.detectedUrls && action.detectedUrls.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 font-semibold text-foreground mb-1">
                    <Link2 className="w-3 h-3" />
                    Detected URLs ({action.detectedUrls.length})
                  </div>
                  <div className="space-y-0.5">
                    {(action.neutralizedUrls || action.detectedUrls).map((url, i) => (
                      <p key={i} className="text-muted-foreground font-mono text-[10px] truncate">{url}</p>
                    ))}
                  </div>
                </div>
              )}
              {action.domainAnalysis != null && (
                <div>
                  <div className="flex items-center gap-1 font-semibold text-foreground mb-1">
                    <Globe className="w-3 h-3" />
                    Domain Analysis
                  </div>
                  <p className="text-muted-foreground">
                    {String(JSON.stringify(action.domainAnalysis)).length > 200
                      ? "Complex analysis — multiple domain flags detected"
                      : "Domain flagged for suspicious indicators"}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {isQuarantined && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={onRelease}
              disabled={isReleasing || isDemo}
            >
              {isReleasing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
              Release
            </Button>
            <Badge variant="outline" className="text-[10px] capitalize ml-auto">
              {action.autoQuarantined ? "Auto-quarantined" : "Manual"}
            </Badge>
          </div>
        )}

        {!isQuarantined && (
          <div className="mt-3 pt-3 border-t border-border">
            <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" variant="secondary">
              Released
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
