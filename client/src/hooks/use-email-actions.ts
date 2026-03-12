import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Email } from "@shared/schema";
import { FOLDER_LABELS } from "@/lib/constants";

export function useEmailActions(
  selectedEmail: Email | null,
  setSelectedEmail: (email: Email | null) => void,
  folder: string
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    queryClient.invalidateQueries({ queryKey: ["/api/emails/counts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/ai/activity"] });
    queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
  };

  const markReadMutation = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      await apiRequest("PATCH", `/api/emails/${id}`, { read });
    },
    onSuccess: (_, { id, read }) => {
      invalidateAll();
      if (selectedEmail?.id === id) {
        setSelectedEmail(selectedEmail ? { ...selectedEmail, read } : null);
      }
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const starMutation = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      await apiRequest("PATCH", `/api/emails/${id}`, { starred });
    },
    onSuccess: (_, { id, starred }) => {
      invalidateAll();
      if (selectedEmail?.id === id) {
        setSelectedEmail(selectedEmail ? { ...selectedEmail, starred } : null);
      }
    },
    onError: () => {
      toast({ title: "Failed to star email", variant: "destructive" });
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
      invalidateAll();
      if (selectedEmail?.id === id) setSelectedEmail(null);
      toast({
        title: folder === "trash" ? "Email deleted permanently" : "Moved to trash",
      });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({
      id,
      targetFolder,
    }: {
      id: string;
      targetFolder: string;
    }) => {
      await apiRequest("PATCH", `/api/emails/${id}`, { folder: targetFolder });
    },
    onSuccess: (_, { id, targetFolder }) => {
      invalidateAll();
      if (selectedEmail?.id === id) setSelectedEmail(null);
      const folderLabel = targetFolder.startsWith("custom:")
        ? targetFolder.replace("custom:", "")
        : FOLDER_LABELS[targetFolder] || targetFolder;
      toast({ title: `Moved to ${folderLabel}` });
    },
    onError: () => {
      toast({ title: "Failed to move email", variant: "destructive" });
    },
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
    onError: () => {
      toast({ title: "Failed to archive", variant: "destructive" });
    },
  });

  return {
    markReadMutation,
    starMutation,
    deleteMutation,
    moveMutation,
    archiveMutation,
  };
}
