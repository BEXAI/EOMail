import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type AgentActivity, type CustomFolder } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/912AF931-1EA4-4CC4-8976-8C6D0557A5A5_1_105_c_1772859976130.jpeg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Inbox,
  Star,
  Send,
  AlertTriangle,
  Trash2,
  Plus,
  Tag,
  Settings,
  Mail,
  Sparkles,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Calendar,
  Shield,
  Bot,
  Archive,
  FileEdit,
  FolderOpen,
  Folder,
  FolderPlus,
  Wand2,
  BellRing,
  Users,
  Newspaper,
  CircleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface SidebarProps {
  onCompose: () => void;
  counts: Record<string, number>;
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  activeLabel: string | null;
  onLabelFilter: (label: string | null) => void;
  userName?: string;
  userEmail?: string;
  userInitials?: string;
  mailboxAddress?: string;
}

const systemFolders = [
  { id: "inbox", label: "Inbox", icon: Inbox, countKey: "inbox" },
  { id: "starred", label: "Starred", icon: Star, countKey: "starred" },
  { id: "sent", label: "Sent", icon: Send, countKey: "sent" },
  { id: "drafts", label: "Drafts", icon: FileEdit, countKey: "drafts" },
  { id: "pending-approvals", label: "Pending Approvals", icon: Sparkles, countKey: "pending-approvals" },
  { id: "archive", label: "Archive", icon: Archive, countKey: "archive" },
  { id: "spam", label: "Spam", icon: AlertTriangle, countKey: "spam" },
  { id: "trash", label: "Trash", icon: Trash2, countKey: "trash" },
  { id: "all", label: "All Mail", icon: Mail, countKey: "all" },
];

const labels = [
  { id: "work", label: "Work", color: "bg-blue-500" },
  { id: "finance", label: "Finance", color: "bg-green-500" },
  { id: "design", label: "Design", color: "bg-purple-500" },
  { id: "important", label: "Important", color: "bg-rose-500" },
];

const agentConfig: Record<string, { icon: typeof DollarSign; color: string; bgColor: string; autonomy: string }> = {
  "FinOps Auto-Resolver": { icon: DollarSign, color: "text-emerald-500", bgColor: "bg-emerald-500/10", autonomy: "L4" },
  "Chrono-Logistics Coordinator": { icon: Calendar, color: "text-blue-500", bgColor: "bg-blue-500/10", autonomy: "L4" },
  "Aegis Gatekeeper": { icon: Shield, color: "text-red-500", bgColor: "bg-red-500/10", autonomy: "L5" },
  "EOMail Assistant": { icon: Sparkles, color: "text-purple-500", bgColor: "bg-purple-500/10", autonomy: "L4" },
};

const folderIconMap: Record<string, typeof Folder> = {
  Finance: DollarSign,
  Scheduling: Calendar,
  Newsletters: Newspaper,
  "Action Required": CircleAlert,
  Social: Users,
  Notifications: BellRing,
};

const folderColorMap: Record<string, string> = {
  emerald: "text-emerald-500",
  blue: "text-blue-500",
  purple: "text-purple-500",
  rose: "text-rose-500",
  amber: "text-amber-500",
  slate: "text-slate-400",
  gray: "text-gray-400",
};

function ActiveAgentsSection() {
  const { data: activities = [] } = useQuery<AgentActivity[]>({
    queryKey: ["/api/ai/activity"],
    refetchInterval: (query) => {
      const data = query.state.data as AgentActivity[] | undefined;
      if (data?.some((a) => a.status === "pending")) return 5000;
      return false;
    },
  });

  const recent = activities.slice(0, 8);
  const pendingCount = activities.filter((a) => a.status === "pending").length;

  if (recent.length === 0) return null;

  return (
    <SidebarGroup className="mt-2">
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-1 px-3 mb-1 w-full group cursor-pointer">
          <Bot className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1 text-left">
            Active Agents
          </span>
          {pendingCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-semibold">
              {pendingCount}
            </span>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <div className="space-y-0.5 px-2">
              {recent.map((activity) => {
                const agent = agentConfig[activity.agentName || "EOMail Assistant"] || agentConfig["EOMail Assistant"];
                const AgentIcon = agent.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-sidebar-accent/50 transition-colors"
                  >
                    <div className={cn("w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 relative", agent.bgColor)}>
                      {activity.status === "pending" && (
                        <div className="absolute -inset-0.5 bg-primary/20 rounded-full animate-ping opacity-50" />
                      )}
                      {activity.status === "pending" ? (
                        <Loader2 className={cn("w-2.5 h-2.5 animate-spin", agent.color)} />
                      ) : (
                        <AgentIcon className={cn("w-2.5 h-2.5", agent.color)} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={cn("font-medium truncate", agent.color)} style={{ fontSize: "10px" }}>
                          {activity.agentName || "EOMail Assistant"}
                        </span>
                        {activity.status === "complete" && (
                          <Check className="w-2.5 h-2.5 text-green-500 shrink-0" />
                        )}
                        {activity.status === "error" && (
                          <X className="w-2.5 h-2.5 text-red-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-muted-foreground leading-tight truncate block" style={{ fontSize: "11px" }}>
                        {activity.action}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

function CustomFoldersSection({
  activeFolder,
  onFolderChange,
  onLabelFilter,
  counts,
}: {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  onLabelFilter: (label: string | null) => void;
  counts: Record<string, number>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: customFoldersList = [] } = useQuery<CustomFolder[]>({
    queryKey: ["/api/folders"],
  });

  const autoOrganizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/auto-organize");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/activity"] });
      toast({
        title: "Inbox organized",
        description: `${data.organized} emails sorted into ${Object.keys(data.stats || {}).length} folders`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Organization failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rootFolders = customFoldersList.filter((f) => !f.parentId);
  const getChildren = (parentId: string) => customFoldersList.filter((f) => f.parentId === parentId);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SidebarGroup className="mt-2">
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-1 px-3 mb-1 w-full group cursor-pointer">
          <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1 text-left">
            Smart Folders
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {rootFolders.map((folder) => {
                const children = getChildren(folder.id);
                const folderKey = `custom:${folder.name}`;
                const isActive = activeFolder === folderKey;
                const FolderIcon = folderIconMap[folder.name] || Folder;
                const colorClass = folderColorMap[folder.color || "blue"] || "text-blue-500";
                const count = counts[folderKey] || 0;
                const isExpanded = expanded[folder.id] ?? false;

                return (
                  <SidebarMenuItem key={folder.id}>
                    <div className="flex flex-col w-full">
                      <SidebarMenuButton
                        onClick={() => { onLabelFilter(null); onFolderChange(folderKey); }}
                        isActive={isActive}
                        className={cn(
                          "rounded-full px-3 py-1.5 cursor-pointer transition-colors relative group/item",
                          isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        )}
                      >
                        {children.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpanded(folder.id); }}
                            className="p-0.5 -ml-1 mr-1"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        <FolderIcon className={cn("w-4 h-4 shrink-0 mr-2", colorClass)} />
                        <span className="flex-1 text-sm">{folder.name}</span>
                        {count > 0 && (
                          <span className="text-xs font-semibold ml-auto text-muted-foreground">{count}</span>
                        )}
                        <Badge variant="outline" className="opacity-0 group-hover/item:opacity-100 transition-opacity text-[8px] h-3.5 px-1 border-primary/20 text-primary uppercase ml-1">PRO</Badge>
                      </SidebarMenuButton>

                      {isExpanded && children.length > 0 && (
                        <div className="ml-6 border-l border-sidebar-border/50 pl-2 mt-0.5 space-y-0.5">
                          {children.map((child) => {
                            const childKey = `custom:${child.name}`;
                            const childActive = activeFolder === childKey;
                            const childCount = counts[childKey] || 0;
                            const ChildIcon = folderIconMap[child.name] || Folder;
                            const childColor = folderColorMap[child.color || "blue"] || "text-blue-500";
                            return (
                              <SidebarMenuButton
                                key={child.id}
                                onClick={() => { onLabelFilter(null); onFolderChange(childKey); }}
                                isActive={childActive}
                                className={cn(
                                  "rounded-full px-3 py-1 cursor-pointer text-sm h-8",
                                  childActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                                )}
                              >
                                <ChildIcon className={cn("w-3.5 h-3.5 shrink-0 mr-2", childColor)} />
                                <span className="flex-1 text-xs">{child.name}</span>
                                {childCount > 0 && (
                                  <span className="text-[10px] font-semibold ml-auto text-muted-foreground">{childCount}</span>
                                )}
                              </SidebarMenuButton>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            <div className="px-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-[10px] text-primary/60 hover:text-primary hover:bg-primary/5 font-bold uppercase tracking-wider"
                onClick={() => autoOrganizeMutation.mutate()}
                disabled={autoOrganizeMutation.isPending}
              >
                {autoOrganizeMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3" />
                )}
                {autoOrganizeMutation.isPending ? "Organizing..." : "Automate Folders"}
              </Button>
            </div>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

export function AppSidebar({ onCompose, counts, activeFolder, onFolderChange, activeLabel, onLabelFilter, userName, userEmail, userInitials, mailboxAddress }: SidebarProps) {
  return (
    <Sidebar className="border-r border-sidebar-border/50">
      <SidebarHeader className="px-3 pt-6 pb-4">
        <div className="flex items-center gap-3 px-2 mb-6 group cursor-default">
          <div className="relative">
            <div className="absolute -inset-1.5 bg-gradient-to-tr from-primary to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <img src={logoPath} alt="EOMail logo" className="relative w-9 h-9 rounded-lg object-cover shadow-2xl border border-white/10" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg text-sidebar-foreground leading-none tracking-tighter uppercase italic">EOMail</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase opacity-70">AI Optimized</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
            </div>
          </div>
        </div>
        <Button
          onClick={onCompose}
          className="w-full justify-start gap-2.5 rounded-xl px-4 py-6 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-primary to-indigo-600 border-0"
          size="default"
          data-testid="button-compose"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight">Compose Message</span>
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2 scrollbar-none">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemFolders.map((folder) => {
                const Icon = folder.icon;
                const count = counts[folder.countKey] || 0;
                const isActive = activeFolder === folder.id && !activeLabel;
                return (
                  <SidebarMenuItem key={folder.id}>
                    <SidebarMenuButton
                      onClick={() => { onLabelFilter(null); onFolderChange(folder.id); }}
                      isActive={isActive}
                      className={cn(
                        "rounded-full px-3 py-2 cursor-pointer transition-all duration-200",
                        isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                      )}
                      data-testid={`nav-folder-${folder.id}`}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", folder.id === "pending-approvals" ? "text-primary" : "text-muted-foreground/80", isActive && "text-primary")} />
                      <span className="flex-1 text-sm font-medium">{folder.label}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "text-xs font-bold ml-auto px-1.5 rounded-full",
                            isActive ? "text-sidebar-accent-foreground" : "text-muted-foreground"
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <CustomFoldersSection
          activeFolder={activeFolder}
          onFolderChange={onFolderChange}
          onLabelFilter={onLabelFilter}
          counts={counts}
        />

        <SidebarGroup className="mt-2 text-muted-foreground/60">
          <div className="flex items-center gap-1 px-3 mb-1">
            <Tag className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Metadata Tags</span>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {labels.map((label) => {
                const isActive = activeLabel === label.id;
                return (
                  <SidebarMenuItem key={label.id}>
                    <SidebarMenuButton
                      onClick={() => onLabelFilter(isActive ? null : label.id)}
                      isActive={isActive}
                      className={cn(
                        "rounded-full px-3 py-1 cursor-pointer h-8",
                        isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full shrink-0 mr-2 shadow-sm", label.color)} />
                      <span className="text-xs">{label.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <ActiveAgentsSection />
      </SidebarContent>

      <SidebarFooter className="px-3 pb-6 pt-4 border-t border-sidebar-border/50 bg-sidebar/50">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sidebar-accent/50 transition-all duration-200 cursor-pointer border border-transparent hover:border-sidebar-border/50">
          <Avatar className="w-9 h-9 shrink-0 ring-1 ring-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white text-[10px] font-black uppercase tracking-tighter shadow-inner">{userInitials || "ME"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-bold text-sidebar-foreground truncate tracking-tight">{userName || "My Account"}</span>
            <span className="text-[10px] text-muted-foreground truncate font-mono tracking-tight opacity-60">{mailboxAddress || userEmail || "operator@eomail.co"}</span>
          </div>
          <Settings className="w-4 h-4 text-muted-foreground shrink-0 hover:text-primary transition-colors" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
