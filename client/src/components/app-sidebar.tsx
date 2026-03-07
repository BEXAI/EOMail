import { useQuery } from "@tanstack/react-query";
import { type AgentActivity } from "@shared/schema";
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
  Bot,
  Check,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}

const folders = [
  { id: "inbox", label: "Inbox", icon: Inbox, countKey: "inbox" },
  { id: "starred", label: "Starred", icon: Star, countKey: "starred" },
  { id: "sent", label: "Sent", icon: Send, countKey: "sent" },
  { id: "pending-approvals", label: "Pending Approvals", icon: Sparkles, countKey: "pending-approvals" },
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

function ActiveAgentsSection() {
  const { data: activities = [] } = useQuery<AgentActivity[]>({
    queryKey: ["/api/ai/activity"],
    refetchInterval: (query) => {
      const data = query.state.data as AgentActivity[] | undefined;
      if (data?.some((a) => a.status === "pending")) return 5000;
      return false;
    },
  });

  const recent = activities.slice(0, 5);
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
            <div className="space-y-1 px-2">
              {recent.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-2 px-2 py-1.5 rounded-md text-xs"
                  data-testid={`agent-activity-${activity.id}`}
                >
                  {activity.status === "pending" && (
                    <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0 mt-0.5" />
                  )}
                  {activity.status === "complete" && (
                    <Check className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                  )}
                  {activity.status === "error" && (
                    <X className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <span className="text-muted-foreground leading-tight truncate">
                    {activity.action}
                  </span>
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

export function AppSidebar({ onCompose, counts, activeFolder, onFolderChange, activeLabel, onLabelFilter, userName, userEmail, userInitials }: SidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2 px-1 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <span className="text-primary-foreground font-bold text-sm">AI</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-sidebar-foreground leading-tight tracking-tight">AIMAIL</span>
            <span className="text-xs text-muted-foreground">.com</span>
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
              {folders.map((folder) => {
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

        <ActiveAgentsSection />
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4 pt-2 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-full hover-elevate cursor-pointer">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{userInitials || "ME"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-sidebar-foreground truncate">{userName || "My Account"}</span>
            <span className="text-xs text-muted-foreground truncate">{userEmail || "me@aimail.com"}</span>
          </div>
          <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
