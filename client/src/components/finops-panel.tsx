import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FinancialDocument } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useDemoData } from "@/hooks/use-demo-data";
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
  DollarSign,
  FileText,
  Check,
  X,
  ChevronDown,
  Clock,
  Building2,
  Receipt,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FinOpsPanelProps {
  isDemo?: boolean;
}

const STATUS_FILTERS = ["all", "extracted", "confirmed", "rejected"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const statusColors: Record<string, { bg: string; text: string }> = {
  extracted: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-400" },
  confirmed: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-400" },
  rejected: { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-400" },
};

export function FinOpsPanel({ isDemo }: FinOpsPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const demoData = useDemoData(isDemo);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: liveDocs = [], isLoading } = useQuery<FinancialDocument[]>({
    queryKey: ["/api/finance/documents"],
    enabled: !isDemo,
  });

  const docs = isDemo ? (demoData?.DEMO_FINANCIAL_DOCUMENTS ?? []) : liveDocs;

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/finance/documents/${id}`, { status: "confirmed" });
    },
    onMutate: (id) => { setConfirmingId(id); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/documents"] });
      toast({ title: "Document confirmed" });
    },
    onError: () => {
      toast({ title: "Failed to confirm document", description: "Please try again.", variant: "destructive" });
    },
    onSettled: () => { setConfirmingId(null); },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/finance/documents/${id}`, { status: "rejected" });
    },
    onMutate: (id) => { setRejectingId(id); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/documents"] });
      toast({ title: "Document rejected" });
    },
    onError: () => {
      toast({ title: "Failed to reject document", description: "Please try again.", variant: "destructive" });
    },
    onSettled: () => { setRejectingId(null); },
  });

  const filtered = statusFilter === "all" ? docs : docs.filter((d) => d.status === statusFilter);
  const totalAmount = docs.reduce((sum, d) => sum + parseFloat(d.total || "0"), 0);
  const pendingCount = docs.filter((d) => d.status === "extracted").length;

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
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 md:px-6 pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">FinOps Dashboard</h1>
            <p className="text-xs text-muted-foreground">Extracted financial documents from your emails</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{docs.length}</p>
              <p className="text-xs text-muted-foreground">Total Documents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-500">${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">Total Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-500">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={statusFilter === filter ? "default" : "outline"}
              className="text-xs h-7 px-3 rounded-full capitalize"
              onClick={() => setStatusFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-6 py-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No financial documents</p>
            <p className="text-xs text-muted-foreground max-w-xs">FinOps Autopilot automatically extracts invoices, receipts, and billing data from your emails. Documents will appear here once detected.</p>
          </div>
        ) : (
          filtered.map((doc) => (
            <FinancialDocCard
              key={doc.id}
              doc={doc}
              onConfirm={() => confirmMutation.mutate(doc.id)}
              onReject={() => rejectMutation.mutate(doc.id)}
              isConfirming={confirmingId === doc.id}
              isRejecting={rejectingId === doc.id}
              isDemo={isDemo}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FinancialDocCard({
  doc,
  onConfirm,
  onReject,
  isConfirming,
  isRejecting,
  isDemo,
}: {
  doc: FinancialDocument;
  onConfirm: () => void;
  onReject: () => void;
  isConfirming: boolean;
  isRejecting: boolean;
  isDemo?: boolean;
}) {
  const status = statusColors[doc.status] || statusColors.extracted;
  const lineItems = (doc.lineItems as Array<{ description: string; quantity: number; amount: number }>) || [];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{doc.vendorName || "Unknown Vendor"}</p>
              <p className="text-xs text-muted-foreground">{doc.invoiceNumber || "No invoice #"}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-foreground">{doc.currency} {parseFloat(doc.total || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <Badge className={cn("text-[10px] font-bold uppercase", status.bg, status.text)} variant="secondary">
              {doc.status}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span className="capitalize">{doc.documentType}</span>
          </div>
          {doc.dueDate && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Due {new Date(doc.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          )}
          {doc.confidenceScore && (
            <div className="flex items-center gap-1">
              <span className={cn(
                "font-semibold",
                doc.confidenceScore >= 80 ? "text-green-500" : doc.confidenceScore >= 50 ? "text-yellow-500" : "text-red-500"
              )}>
                {doc.confidenceScore}% confidence
              </span>
            </div>
          )}
        </div>

        {lineItems.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer mb-2">
              <ChevronDown className="w-3 h-3" />
              {lineItems.length} line item{lineItems.length > 1 ? "s" : ""}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground/80">{item.description} {item.quantity > 1 ? `x${item.quantity}` : ""}</span>
                    <span className="font-medium text-foreground">${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {doc.status === "extracted" && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={onConfirm}
              disabled={isConfirming || isDemo}
              aria-label="Confirm financial document"
            >
              {isConfirming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={onReject}
              disabled={isRejecting || isDemo}
              aria-label="Reject financial document"
            >
              {isRejecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
