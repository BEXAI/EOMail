import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Email, type EmailFolder } from "@shared/schema";
import { AppSidebar } from "@/components/app-sidebar";
import { EmailList } from "@/components/email-list";
import { EmailDetail } from "@/components/email-detail";
import { ComposeDialog } from "@/components/compose-dialog";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  RefreshCw,
  Settings,
  ChevronDown,
  X,
  SlidersHorizontal,
  Moon,
  Sun,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const FOLDER_LABELS: Record<string, string> = {
  inbox: "Inbox",
  starred: "Starred",
  sent: "Sent",
  drafts: "Drafts",
  spam: "Spam",
  trash: "Trash",
};

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggle = () => {
    document.documentElement.classList.toggle("dark");
    setDark((d) => !d);
  };

  return (
    <Button size="icon" variant="ghost" onClick={toggle} data-testid="button-theme-toggle">
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

export default function MailPage() {
  const [folder, setFolder] = useState<string>("inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<Email | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: emails = [], isLoading: emailsLoading } = useQuery<Email[]>({
    queryKey: ["/api/emails", folder, search],
    queryFn: async () => {
      const params = new URLSearchParams({ folder });
      if (search) params.append("search", search);
      const res = await fetch(`/api/emails?${params}`);
      if (!res.ok) throw new Error("Failed to fetch emails");
      return res.json();
    },
  });

  const { data: counts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/emails/counts"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/emails/${id}`, { read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
    },
  });

  const starMutation = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      await apiRequest("PATCH", `/api/emails/${id}`, { starred });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
      if (selectedEmail) {
        setSelectedEmail((prev) => prev ? { ...prev, starred: !prev.starred } : null);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (folder === "trash") {
        await apiRequest("DELETE", `/api/emails/${id}`);
      } else {
        await apiRequest("PATCH", `/api/emails/${id}`, { folder: "trash" });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
      if (selectedEmail?.id === id) setSelectedEmail(null);
      toast({ title: folder === "trash" ? "Email deleted" : "Moved to trash" });
    },
  });

  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    if (!email.read) markReadMutation.mutate(email.id);
  };

  const handleFolderChange = (newFolder: string) => {
    setFolder(newFolder);
    setSelectedEmail(null);
    setSearch("");
    setSearchInput("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const clearSearch = () => {
    setSearch("");
    setSearchInput("");
  };

  const handleReply = (email: Email) => {
    setReplyTo(email);
    setComposing(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
    toast({ title: "Refreshed" });
  };

  const sidebarStyle = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar
          onCompose={() => { setReplyTo(null); setComposing(true); }}
          counts={counts}
          activeFolder={folder}
          onFolderChange={handleFolderChange}
        />

        <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="flex items-center gap-3 px-4 py-2 border-b border-border shrink-0 bg-background sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Separator orientation="vertical" className="h-5" />
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search mail"
                  className="pl-9 pr-9 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:bg-background"
                  data-testid="input-search"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 text-muted-foreground"
                    data-testid="button-clear-search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRefresh}
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" data-testid="button-settings">
                <Settings className="w-4 h-4" />
              </Button>
              <ThemeToggle />
              <div
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold cursor-pointer ml-1"
                data-testid="avatar-user"
              >
                ME
              </div>
            </div>
          </header>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div
              className={cn(
                "flex flex-col border-r border-border shrink-0 overflow-hidden transition-all",
                selectedEmail ? "w-[380px] min-w-[280px]" : "flex-1"
              )}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm text-foreground" data-testid="folder-title">
                    {FOLDER_LABELS[folder] || folder}
                  </h2>
                  {search && (
                    <span className="text-xs text-muted-foreground">
                      — {emails.length} result{emails.length !== 1 ? "s" : ""} for "{search}"
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" data-testid="button-filter">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <EmailList
                  emails={emails}
                  isLoading={emailsLoading}
                  selectedId={selectedEmail?.id ?? null}
                  onSelect={handleSelectEmail}
                  onStar={(id, starred) => starMutation.mutate({ id, starred })}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  folder={folder}
                  search={search}
                />
              </div>
            </div>

            {selectedEmail && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <EmailDetail
                  email={selectedEmail}
                  onBack={() => setSelectedEmail(null)}
                  onStar={(id, starred) => starMutation.mutate({ id, starred })}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onReply={handleReply}
                />
              </div>
            )}

            {!selectedEmail && (
              <div className="hidden md:flex flex-1 items-center justify-center">
                <div className="text-center px-8">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <div className="w-10 h-10 text-muted-foreground flex items-center justify-center font-bold text-primary text-xl">
                      AI
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">AIMAIL</h3>
                  <p className="text-sm text-muted-foreground">Select an email to read</p>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>

      <ComposeDialog
        isOpen={composing}
        onClose={() => { setComposing(false); setReplyTo(null); }}
        replyTo={replyTo}
      />
    </SidebarProvider>
  );
}
