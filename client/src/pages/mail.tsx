import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Email } from "@shared/schema";
import { AppSidebar } from "@/components/app-sidebar";
import { EmailList } from "@/components/email-list";
import { EmailDetail } from "@/components/email-detail";
import { ComposeDialog, type ComposeData } from "@/components/compose-dialog";
import { MorningBriefing } from "@/components/morning-briefing";
import { AiCommandBar } from "@/components/ai-command-bar";
import { AiChatPanel } from "@/components/ai-chat-panel";
import { ThemeToggle } from "@/components/theme-toggle";
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
  X,
  SlidersHorizontal,
  Keyboard,
  Bot,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FOLDER_LABELS: Record<string, string> = {
  inbox: "Inbox",
  starred: "Starred",
  sent: "Sent",
  drafts: "Drafts",
  "pending-approvals": "Pending Approvals",
  archive: "Archive",
  spam: "Spam",
  trash: "Trash",
  all: "All Mail",
};

export default function MailPage() {
  const [folder, setFolder] = useState<string>("inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<Email | null>(null);
  const [composePrefill, setComposePrefill] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [editingDraft, setEditingDraft] = useState<Email | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatPanelExpanded, setChatPanelExpanded] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);

  const queryParams = new URLSearchParams({ folder });
  if (search) queryParams.append("search", search);
  if (labelFilter) queryParams.append("label", labelFilter);

  const { data: emails = [], isLoading: emailsLoading } = useQuery<Email[]>({
    queryKey: ["/api/emails", folder, search, labelFilter],
    queryFn: async () => {
      const res = await fetch(`/api/emails?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch emails");
      return res.json();
    },
  });

  const { data: counts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/emails/counts"],
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/ai/activity"] });
    queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
  }, [queryClient]);

  const closeCompose = useCallback(() => {
    setComposing(false);
    setReplyTo(null);
    setComposePrefill(null);
    setEditingDraft(null);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch("");
    setSearchInput("");
  }, []);

  const markReadMutation = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      await apiRequest("PATCH", `/api/emails/${id}`, { read });
    },
    onSuccess: (_, { id, read }) => {
      invalidateAll();
      if (selectedEmail?.id === id) {
        setSelectedEmail((prev) => prev ? { ...prev, read } : null);
      }
    },
    onError: () => { toast({ title: "Failed to update", variant: "destructive" }); },
  });

  const starMutation = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      await apiRequest("PATCH", `/api/emails/${id}`, { starred });
    },
    onSuccess: (_, { id, starred }) => {
      invalidateAll();
      if (selectedEmail?.id === id) {
        setSelectedEmail((prev) => prev ? { ...prev, starred } : null);
      }
    },
    onError: () => { toast({ title: "Failed to star email", variant: "destructive" }); },
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
      invalidateAll();
      if (selectedEmail?.id === id) setSelectedEmail(null);
      toast({ title: folder === "trash" ? "Email deleted permanently" : "Moved to trash" });
    },
    onError: () => { toast({ title: "Failed to delete", variant: "destructive" }); },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, targetFolder }: { id: string; targetFolder: string }) => {
      await apiRequest("PATCH", `/api/emails/${id}`, { folder: targetFolder });
    },
    onSuccess: (_, { id, targetFolder }) => {
      invalidateAll();
      if (selectedEmail?.id === id) setSelectedEmail(null);
      const folderLabel = targetFolder.startsWith("custom:") ? targetFolder.replace("custom:", "") : (FOLDER_LABELS[targetFolder] || targetFolder);
      toast({ title: `Moved to ${folderLabel}` });
    },
    onError: () => { toast({ title: "Failed to move email", variant: "destructive" }); },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/emails/${id}`, { folder: "archive" });
    },
    onSuccess: (_, id) => {
      invalidateAll();
      if (selectedEmail?.id === id) setSelectedEmail(null);
      toast({ title: "Archived" });
    },
    onError: () => { toast({ title: "Failed to archive", variant: "destructive" }); },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: ComposeData & { draftId?: string }) => {
      const now = new Date();
      await apiRequest("POST", "/api/emails", {
        from: user?.displayName || user?.username || "You",
        fromEmail: user?.mailboxAddress || user?.email || "",
        to: data.to.split("@")[0] || data.to,
        toEmail: data.to,
        cc: data.cc || "",
        bcc: data.bcc || "",
        subject: data.subject || "(no subject)",
        body: `<p>${data.body.replace(/\n/g, "</p><p>")}</p>`,
        preview: data.body.slice(0, 120),
        timestamp: now.toISOString(),
        read: true,
        starred: false,
        folder: "sent",
        labels: [],
        attachments: 0,
      });
      if (data.draftId) {
        await apiRequest("DELETE", `/api/emails/${data.draftId}`);
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Email sent", description: "Your message has been sent successfully." });
    },
    onError: () => {
      toast({ title: "Failed to send", description: "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (data: ComposeData & { draftId?: string }) => {
      const now = new Date();
      if (data.draftId) {
        await apiRequest("PATCH", `/api/emails/${data.draftId}`, {
          to: data.to.split("@")[0] || data.to || "Draft",
          toEmail: data.to || "",
          cc: data.cc || "",
          bcc: data.bcc || "",
          subject: data.subject || "(no subject)",
          body: `<p>${data.body.replace(/\n/g, "</p><p>")}</p>`,
          preview: data.body.slice(0, 120) || "(empty draft)",
          folder: "drafts",
        });
      } else {
        await apiRequest("POST", "/api/emails", {
          from: user?.displayName || user?.username || "You",
          fromEmail: user?.mailboxAddress || user?.email || "",
          to: data.to.split("@")[0] || data.to || "Draft",
          toEmail: data.to || "",
          cc: data.cc || "",
          bcc: data.bcc || "",
          subject: data.subject || "(no subject)",
          body: `<p>${data.body.replace(/\n/g, "</p><p>")}</p>`,
          preview: data.body.slice(0, 120) || "(empty draft)",
          timestamp: now.toISOString(),
          read: true,
          starred: false,
          folder: "drafts",
          labels: [],
          attachments: 0,
        });
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Draft saved" });
    },
    onError: () => {
      toast({ title: "Failed to save draft", variant: "destructive" });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: string }) => {
      const bulkUpdates: Record<string, { action: string; updates?: Record<string, any> }> = {
        delete: folder === "trash"
          ? { action: "delete" }
          : { action: "update", updates: { folder: "trash" } },
        read: { action: "update", updates: { read: true } },
        unread: { action: "update", updates: { read: false } },
        star: { action: "update", updates: { starred: true } },
        archive: { action: "update", updates: { folder: "archive" } },
      };
      const config = bulkUpdates[action];
      if (config) {
        await apiRequest("POST", "/api/emails/bulk", { ids, ...config });
      }
    },
    onSuccess: (_, { action }) => {
      invalidateAll();
      setSelectedEmail(null);
      const messages: Record<string, string> = {
        delete: folder === "trash" ? "Emails deleted permanently" : "Moved to trash",
        read: "Marked as read",
        unread: "Marked as unread",
        star: "Starred",
        archive: "Archived",
      };
      toast({ title: messages[action] || "Done" });
    },
    onError: () => { toast({ title: "Bulk action failed", variant: "destructive" }); },
  });

  const handleSelectEmail = useCallback((email: Email) => {
    if (folder === "drafts") {
      setEditingDraft(email);
      setReplyTo(null);
      setComposePrefill(null);
      setComposing(true);
      return;
    }
    setSelectedEmail(email);
    if (!email.read) markReadMutation.mutate({ id: email.id, read: true });
  }, [markReadMutation, folder]);

  const handleFolderChange = useCallback((newFolder: string) => {
    setFolder(newFolder);
    setSelectedEmail(null);
    clearSearch();
  }, [clearSearch]);

  const handleLabelFilter = useCallback((label: string | null) => {
    setLabelFilter(label);
    setSelectedEmail(null);
    if (label) {
      setFolder("inbox");
      clearSearch();
    }
  }, [clearSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleReply = useCallback((email: Email) => {
    setReplyTo(email);
    setComposePrefill(null);
    setComposing(true);
  }, []);

  const handleRefresh = () => {
    invalidateAll();
    toast({ title: "Refreshed" });
  };

  const handleSaveDraft = useCallback((data: ComposeData & { draftId?: string }) => {
    saveDraftMutation.mutate(data);
  }, [saveDraftMutation]);

  const discardDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      await apiRequest("DELETE", `/api/emails/${draftId}`);
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Draft discarded" });
    },
    onError: () => { toast({ title: "Failed to discard draft", variant: "destructive" }); },
  });

  const handleDiscardDraft = useCallback((draftId: string) => {
    discardDraftMutation.mutate(draftId);
  }, [discardDraftMutation]);

  const handleSend = (data: ComposeData) => {
    const currentDraftId = editingDraft?.id;
    setComposing(false);

    const { dismiss } = toast({
      title: "Sending...",
      description: "Email will be sent in 5 seconds",
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (undoTimer) clearTimeout(undoTimer);
            setUndoTimer(null);
            dismiss();
            setComposing(true);
            toast({ title: "Send cancelled" });
          }}
          data-testid="button-undo-send"
        >
          Undo
        </Button>
      ),
      duration: 5500,
    });

    const timer = setTimeout(() => {
      sendMutation.mutate({ ...data, draftId: currentDraftId });
      setUndoTimer(null);
      closeCompose();
    }, 5000);

    setUndoTimer(timer);
  };

  const handleCompose = useCallback(() => {
    setReplyTo(null);
    setComposePrefill(null);
    setEditingDraft(null);
    setComposing(true);
  }, []);

  const handleComposeWithPrefill = useCallback((prefill: { to: string; subject: string; body: string }) => {
    setReplyTo(null);
    setComposePrefill(prefill);
    setComposing(true);
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimer) clearTimeout(undoTimer);
    };
  }, [undoTimer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandBarOpen(true);
        return;
      }

      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;

      switch (e.key) {
        case "c":
          e.preventDefault();
          handleCompose();
          break;
        case "r":
          if (selectedEmail) {
            e.preventDefault();
            handleReply(selectedEmail);
          }
          break;
        case "s":
          if (selectedEmail) {
            e.preventDefault();
            starMutation.mutate({ id: selectedEmail.id, starred: !selectedEmail.starred });
          }
          break;
        case "e":
          if (selectedEmail) {
            e.preventDefault();
            archiveMutation.mutate(selectedEmail.id);
          }
          break;
        case "#":
          if (selectedEmail) {
            e.preventDefault();
            deleteMutation.mutate(selectedEmail.id);
          }
          break;
        case "/":
          e.preventDefault();
          searchRef.current?.focus();
          break;
        case "Escape":
          if (composing) {
            closeCompose();
          } else if (selectedEmail) {
            setSelectedEmail(null);
          }
          break;
        case "j": {
          e.preventDefault();
          const currentIndex = emails.findIndex((em) => em.id === selectedEmail?.id);
          if (currentIndex < emails.length - 1) {
            handleSelectEmail(emails[currentIndex + 1]);
          } else if (currentIndex === -1 && emails.length > 0) {
            handleSelectEmail(emails[0]);
          }
          break;
        }
        case "k": {
          e.preventDefault();
          const currentIdx = emails.findIndex((em) => em.id === selectedEmail?.id);
          if (currentIdx > 0) {
            handleSelectEmail(emails[currentIdx - 1]);
          }
          break;
        }
        case "Enter":
          if (!selectedEmail && emails.length > 0) {
            handleSelectEmail(emails[0]);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEmail, composing, emails, handleCompose, handleReply, handleSelectEmail, closeCompose]);

  const sidebarStyle = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  const headerTitle = labelFilter
    ? `Label: ${labelFilter.charAt(0).toUpperCase() + labelFilter.slice(1)}`
    : folder.startsWith("custom:")
      ? folder.replace("custom:", "")
      : FOLDER_LABELS[folder] || folder;

  const emailActions = {
    onStar: (id: string, starred: boolean) => starMutation.mutate({ id, starred }),
    onDelete: (id: string) => deleteMutation.mutate(id),
    onMarkRead: (id: string, read: boolean) => markReadMutation.mutate({ id, read }),
    onMove: (id: string, targetFolder: string) => moveMutation.mutate({ id, targetFolder }),
    onArchive: (id: string) => archiveMutation.mutate(id),
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex w-full bg-background overflow-hidden h-screen">
        <AppSidebar
          onCompose={handleCompose}
          counts={counts}
          activeFolder={folder}
          onFolderChange={handleFolderChange}
          activeLabel={labelFilter}
          onLabelFilter={handleLabelFilter}
          userName={user?.displayName}
          userEmail={user?.email}
          userInitials={user?.avatarInitials}
          mailboxAddress={user?.mailboxAddress}
        />

        <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="flex items-center gap-3 px-4 py-2 border-b border-border shrink-0 bg-background sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Separator orientation="vertical" className="h-5" />
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchRef}
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search mail (Press /)"
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleRefresh}
                    data-testid="button-refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-keyboard-shortcuts">
                    <Keyboard className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  <div className="space-y-1">
                    <div><kbd className="bg-muted px-1 rounded text-xs">c</kbd> Compose</div>
                    <div><kbd className="bg-muted px-1 rounded text-xs">r</kbd> Reply</div>
                    <div><kbd className="bg-muted px-1 rounded text-xs">s</kbd> Star</div>
                    <div><kbd className="bg-muted px-1 rounded text-xs">e</kbd> Archive</div>
                    <div><kbd className="bg-muted px-1 rounded text-xs">j/k</kbd> Navigate</div>
                    <div><kbd className="bg-muted px-1 rounded text-xs">/</kbd> Search</div>
                    <div><kbd className="bg-muted px-1 rounded text-xs">⌘K</kbd> AI Command</div>
                    <div><kbd className="bg-muted px-1 rounded text-xs">Esc</kbd> Close</div>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setChatPanelOpen(!chatPanelOpen)}
                    className={cn(chatPanelOpen && "bg-violet-500/10 text-violet-500")}
                    data-testid="button-ai-chat-toggle"
                  >
                    <Bot className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>AI Assistant</TooltipContent>
              </Tooltip>
              <ThemeToggle />
              <div
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold cursor-pointer ml-1"
                data-testid="avatar-user"
                onClick={() => logoutMutation.mutate(undefined)}
                title={`${user?.displayName} — Click to sign out`}
              >
                {user?.avatarInitials || "ME"}
              </div>
            </div>
          </header>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div
              className={cn(
                "flex flex-col border-r border-border overflow-hidden transition-all",
                selectedEmail
                  ? "hidden md:flex md:w-[380px] md:min-w-[280px] md:shrink-0"
                  : "flex-1"
              )}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm text-foreground" data-testid="folder-title">
                    {headerTitle}
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
                  {...emailActions}
                  onBulkAction={(ids, action) => bulkMutation.mutate({ ids, action })}
                  folder={folder}
                  search={search}
                  labelFilter={labelFilter}
                />
              </div>
            </div>

            {selectedEmail && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <EmailDetail
                  email={selectedEmail}
                  onBack={() => setSelectedEmail(null)}
                  {...emailActions}
                  onReply={handleReply}
                  onCompose={handleComposeWithPrefill}
                />
              </div>
            )}

            {!selectedEmail && (
              <div className="hidden md:flex flex-1 overflow-hidden">
                <MorningBriefing
                  userName={user?.displayName}
                  emails={emails}
                  onSelectEmail={handleSelectEmail}
                />
              </div>
            )}
          </div>
        </SidebarInset>
      </div>

      <ComposeDialog
        isOpen={composing}
        onClose={closeCompose}
        onSend={handleSend}
        onSaveDraft={handleSaveDraft}
        onDiscardDraft={handleDiscardDraft}
        isSending={sendMutation.isPending}
        replyTo={replyTo}
        prefill={composePrefill}
        editDraft={editingDraft}
      />

      <AiCommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
      <AiChatPanel isOpen={chatPanelOpen} onToggle={() => setChatPanelOpen(!chatPanelOpen)} onExpandChange={setChatPanelExpanded} emailId={selectedEmail?.id} />
    </SidebarProvider>
  );
}
