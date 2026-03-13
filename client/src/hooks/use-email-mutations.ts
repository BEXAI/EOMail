import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type ComposeData } from "@/components/compose-dialog";
import { useLocation } from "wouter";
import { type Email } from "@shared/schema";
import { type AuthUser } from "@/hooks/use-auth";

export function useEmailMutations({
    user,
    folder,
    setSelectedEmail,
}: {
    user: AuthUser | null;
    folder: string;
    setSelectedEmail: (email: Email | null) => void;
}) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
        queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/ai/activity"] });
        queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
    };

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

    return {
        sendMutation,
        saveDraftMutation,
        discardDraftMutation,
        bulkMutation,
        invalidateAll,
    };
}
