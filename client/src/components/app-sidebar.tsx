import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type AgentActivity, type CustomFolder } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useDemoData } from "@/hooks/use-demo-data";
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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useLocation } from "wouter";

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
  isDemo?: boolean;
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

function ActiveAgentsSection({ isDemo }: { isDemo?: boolean }) {
  const demoData = useDemoData(isDemo);
  const { data: liveActivities = [] } = useQuery<AgentActivity[]>({
    queryKey: ["/api/ai/activity"],
    enabled: !isDemo,
    refetchInterval: (query) => {
      const data = query.state.data as AgentActivity[] | undefined;
      if (data?.some((a) => a.status === "pending")) return 5000;
      return false;
    },
  });

  const activities = isDemo ? (demoData?.DEMO_AGENT_ACTIVITY ?? []) : liveActivities;
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
                    className="flex items-start gap-2 px-2 py-1.5 rounded-md text-xs"
                    data-testid={`agent-activity-${activity.id}`}
                  >
                    <div className={cn("w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5", agent.bgColor)}>
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
  isDemo,
}: {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  onLabelFilter: (label: string | null) => void;
  counts: Record<string, number>;
  isDemo?: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const demoData = useDemoData(isDemo);
  const { data: liveFolders = [] } = useQuery<CustomFolder[]>({
    queryKey: ["/api/folders"],
    enabled: !isDemo,
  });

  const customFoldersList = isDemo ? (demoData?.DEMO_CUSTOM_FOLDERS ?? []) : liveFolders;

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

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/folders", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
      setCreatingFolder(false);
      setNewFolderName("");
      toast({ title: "Folder created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create folder", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    createFolderMutation.mutate(name);
  };

  const rootFolders = customFoldersList.filter((f) => !f.parentId);
  const getChildren = (parentId: string) => customFoldersList.filter((f) => f.parentId === parentId);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (rootFolders.length === 0 && !autoOrganizeMutation.isPending) {
    return (
      <SidebarGroup className="mt-2">
        <div className="flex items-center gap-1 px-3 mb-1">
          <FolderPlus className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Smart Folders</span>
        </div>
        <SidebarGroupContent>
          <div className="px-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs rounded-lg border-dashed"
              onClick={() => autoOrganizeMutation.mutate()}
              disabled={autoOrganizeMutation.isPending}
              data-testid="button-auto-organize"
            >
              {autoOrganizeMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              Automate Emails Into Folders
            </Button>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

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
                const isActive = activeFolder === folderKey && true;
                const FolderIcon = folderIconMap[folder.name] || Folder;
                const colorClass = folderColorMap[folder.color || "blue"] || "text-blue-500";
                const count = counts[folderKey] || 0;
                const isExpanded = expanded[folder.id] ?? false;

                if (children.length > 0) {
                  return (
                    <SidebarMenuItem key={folder.id}>
                      <div>
                        <SidebarMenuButton
                          onClick={() => { onLabelFilter(null); onFolderChange(folderKey); }}
                          isActive={isActive}
                          className={cn(
                            "rounded-full px-3 py-1.5 cursor-pointer transition-colors",
                            isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                          )}
                          data-testid={`nav-custom-folder-${folder.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpanded(folder.id); }}
                            className="p-0.5 -ml-1"
                            data-testid={`toggle-folder-${folder.name.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            )}
                          </button>
                          <FolderIcon className={cn("w-4 h-4 shrink-0", colorClass)} />
                          <span className="flex-1 text-sm">{folder.name}</span>
                          {count > 0 && (
                            <span className="text-xs font-semibold ml-auto text-muted-foreground">{count}</span>
                          )}
                        </SidebarMenuButton>
                        {isExpanded && (
                          <div className="ml-4 border-l border-sidebar-border pl-1">
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
                                    "rounded-full px-3 py-1 cursor-pointer text-sm",
                                    childActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                                  )}
                                  data-testid={`nav-custom-folder-${child.name.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  <ChildIcon className={cn("w-3.5 h-3.5 shrink-0", childColor)} />
                                  <span className="flex-1">{child.name}</span>
                                  {childCount > 0 && (
                                    <span className="text-xs font-semibold ml-auto text-muted-foreground">{childCount}</span>
                                  )}
                                </SidebarMenuButton>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={folder.id}>
                    <SidebarMenuButton
                      onClick={() => { onLabelFilter(null); onFolderChange(folderKey); }}
                      isActive={isActive}
                      className={cn(
                        "rounded-full px-3 py-1.5 cursor-pointer transition-colors",
                        isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      )}
                      data-testid={`nav-custom-folder-${folder.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <FolderIcon className={cn("w-4 h-4 shrink-0", colorClass)} />
                      <span className="flex-1 text-sm">{folder.name}</span>
                      {count > 0 && (
                        <span className="text-xs font-semibold ml-auto text-muted-foreground">{count}</span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            {!isDemo && (
              <div className="px-2 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => autoOrganizeMutation.mutate()}
                  disabled={autoOrganizeMutation.isPending}
                  data-testid="button-auto-organize"
                >
                  {autoOrganizeMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  {autoOrganizeMutation.isPending ? "Organizing..." : "Automate Emails Into Folders"}
                </Button>
                {creatingFolder ? (
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      value={newFolderName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
                      placeholder="Folder name"
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") handleCreateFolder();
                        if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
                      }}
                      data-testid="input-new-folder"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={handleCreateFolder}
                      disabled={createFolderMutation.isPending || !newFolderName.trim()}
                      data-testid="button-confirm-new-folder"
                    >
                      {createFolderMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => { setCreatingFolder(false); setNewFolderName(""); }}
                      data-testid="button-cancel-new-folder"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground mt-0.5"
                    onClick={() => setCreatingFolder(true)}
                    data-testid="button-new-folder"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    New Folder
                  </Button>
                )}
              </div>
            )}
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

export function AppSidebar({ onCompose, counts, activeFolder, onFolderChange, activeLabel, onLabelFilter, userName, userEmail, userInitials, mailboxAddress, isDemo }: SidebarProps) {
  const [, setLocation] = useLocation();
  return (
    <Sidebar>
      <SidebarHeader className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2 px-1 mb-3">
          <img src={logoPath} alt="EOMail logo" className="w-8 h-8 rounded-md object-cover" />
          <div className="flex flex-col">
            <span className="font-bold text-base text-sidebar-foreground leading-tight tracking-tight">EOMail</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Inbox Zero → Zero Time Spent</span>
          </div>
        </div>
        <Button
          onClick={onCompose}
          className="w-full justify-start gap-2 rounded-2xl px-4 shadow-md"
          size="default"
          data-testid="button-compose"
        >
          <Plus className="w-4 h-4" />
          Compose
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2">
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
                        "rounded-full px-3 py-2 cursor-pointer transition-colors",
                        isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      )}
                      data-testid={`nav-folder-${folder.id}`}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", folder.id === "pending-approvals" && "text-primary")} />
                      <span className="flex-1">{folder.label}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "text-xs font-semibold ml-auto",
                            isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground"
                          )}
                          data-testid={`count-${folder.id}`}
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

        <SidebarGroup className="mt-2">
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-1 px-3 mb-1 w-full group cursor-pointer">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1 text-left">
                AI Features
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {([
                    { id: "finops", label: "FinOps", icon: DollarSign, color: "text-emerald-500", countKey: "finops" },
                    { id: "calendar", label: "Calendar", icon: Calendar, color: "text-blue-500", countKey: "calendar" },
                    { id: "security", label: "Security", icon: Shield, color: "text-red-500", countKey: "security" },
                  ] as const).map((item) => {
                    const Icon = item.icon;
                    const isActive = activeFolder === item.id && !activeLabel;
                    const count = counts[item.countKey] || 0;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => { onLabelFilter(null); onFolderChange(item.id); }}
                          isActive={isActive}
                          className={cn(
                            "rounded-full px-3 py-1.5 cursor-pointer transition-colors",
                            isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                          )}
                          data-testid={`nav-ai-${item.id}`}
                        >
                          <Icon className={cn("w-4 h-4 shrink-0", item.color)} />
                          <span className="flex-1 text-sm">{item.label}</span>
                          {count > 0 && (
                            <span className="text-xs font-semibold ml-auto text-muted-foreground">{count}</span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <CustomFoldersSection
          activeFolder={activeFolder}
          onFolderChange={onFolderChange}
          onLabelFilter={onLabelFilter}
          counts={counts}
          isDemo={isDemo}
        />

        <SidebarGroup className="mt-2">
          <div className="flex items-center gap-1 px-3 mb-1">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</span>
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
                        "rounded-full px-3 py-1.5 cursor-pointer",
                        isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      )}
                      data-testid={`nav-label-${label.id}`}
                    >
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", label.color)} />
                      <span className="text-sm">{label.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <ActiveAgentsSection isDemo={isDemo} />
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4 pt-2 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-full hover-elevate cursor-pointer">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{userInitials || "ME"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-sidebar-foreground truncate">{userName || "My Account"}</span>
            <span className="text-xs text-muted-foreground truncate">{mailboxAddress || userEmail || "me@eomail.co"}</span>
          </div>
          <button
            onClick={() => setLocation("/settings")}
            className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
            title="Settings"
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
