import { useLayoutEffect, useRef, useState } from "react";
import {
  Plus, Inbox, Star, Send, FileEdit, Sparkles, Archive, AlertTriangle, Trash2, Mail,
  DollarSign, Calendar, Shield, FolderPlus, Wand2, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoPath from "@assets/912AF931-1EA4-4CC4-8976-8C6D0557A5A5_1_105_c_1772859976130.jpeg";

// Mirrors the app sidebar (components/app-sidebar.tsx) in dark mode, laid out compactly
const MAIL_ITEMS = [
  { label: "Inbox", icon: Inbox, active: true },
  { label: "Starred", icon: Star },
  { label: "Sent", icon: Send, count: 4 },
  { label: "Drafts", icon: FileEdit, count: 1 },
  { label: "Pending Approvals", icon: Sparkles, iconClass: "text-blue-500" },
  { label: "Archive", icon: Archive },
  { label: "Spam", icon: AlertTriangle },
  { label: "Trash", icon: Trash2 },
  { label: "All Mail", icon: Mail, count: 5 },
];

const AI_ITEMS = [
  { label: "FinOps", icon: DollarSign, iconClass: "text-emerald-500" },
  { label: "Calendar", icon: Calendar, iconClass: "text-blue-500" },
  { label: "Security", icon: Shield, iconClass: "text-red-500", active: true },
];

type Item = { label: string; icon: typeof Inbox; count?: number; iconClass?: string; active?: boolean };

function Row({ label, icon: Icon, count, iconClass, active }: Item) {
  return (
    <div className={cn("flex items-center gap-2 h-[22px] px-2 rounded-full", active && "bg-white/[0.07]")}>
      <Icon className={cn("w-3.5 h-3.5 shrink-0", iconClass ?? "text-slate-300")} aria-hidden="true" />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <span className="font-semibold text-slate-200">{count}</span>}
    </div>
  );
}

function SectionLabel({ icon: Icon, children, collapsible }: { icon: typeof Inbox; children: string; collapsible?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 h-[22px] px-2 text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span className="flex-1">{children}</span>
      {collapsible && <ChevronUp className="w-3 h-3" aria-hidden="true" />}
    </div>
  );
}

/**
 * The full EOMail menu in dark mode, compressed into two columns. If the space it is given is
 * shorter than its natural height, it scales down uniformly so the whole menu always stays visible.
 */
export function MenuPreview({ className }: { className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, offset: 0 });

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const available = outer.clientHeight;
      const natural = inner.offsetHeight;
      if (natural <= 0 || available <= 0) return;
      const scale = Math.min(1, available / natural);
      // Center vertically when there is room to spare
      setFit({ scale, offset: Math.max(0, (available - natural * scale) / 2) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <figure
      ref={outerRef}
      className={cn("relative overflow-hidden rounded-[1.75rem] bg-[#1b2027] ring-1 ring-border shadow-lg", className)}
      role="img"
      aria-label="The EOMail menu in dark mode: Compose, Inbox, Starred, Sent, Drafts, Pending Approvals, Archive, Spam, Trash, All Mail, the FinOps, Calendar and Security AI features, and Smart Folders"
      data-testid="welcome-preview"
    >
      <div
        ref={innerRef}
        className="absolute inset-x-0 top-0 p-3 text-[11.5px] text-slate-100 select-none"
        style={{ transform: `translateY(${fit.offset}px) scale(${fit.scale})`, transformOrigin: "top center" }}
        aria-hidden="true"
        data-testid="welcome-preview-menu"
      >
        <div className="flex items-center gap-2 px-1">
          <img src={logoPath} alt="" className="w-7 h-7 rounded-lg object-cover" />
          <div className="leading-tight">
            <p className="text-[13px] font-bold">EOMail</p>
            <p className="text-[9.5px] text-slate-400">Inbox Zero → Zero Time Spent</p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 h-7 px-3 rounded-full bg-[#0f6fd6] ring-1 ring-blue-400/50 font-medium">
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          Compose
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-x-2">
          <div className="space-y-px">
            {MAIL_ITEMS.map((item) => (
              <Row key={item.label} {...item} />
            ))}
          </div>
          <div className="space-y-px">
            <SectionLabel icon={Sparkles} collapsible>AI Features</SectionLabel>
            {AI_ITEMS.map((item) => (
              <Row key={item.label} {...item} />
            ))}
            <div className="pt-2">
              <SectionLabel icon={FolderPlus}>Smart Folders</SectionLabel>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-dashed border-slate-600 text-[10.5px] leading-tight">
              <Wand2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Automate Emails Into Folders
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
