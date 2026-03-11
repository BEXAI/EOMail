import { useEffect } from "react";

interface KeyboardShortcuts {
  composing: boolean;
  selectedEmail: any;
  emails: any[];
  handleCompose: () => void;
  handleReply: (email: any) => void;
  handleSelectEmail: (email: any) => void;
  closeCompose: () => void;
  starMutation: any;
  archiveMutation: any;
  deleteMutation: any;
  searchRef: React.RefObject<HTMLInputElement>;
  setCommandBarOpen: (open: boolean) => void;
}

export function useKeyboardShortcuts({
  composing,
  selectedEmail,
  emails,
  handleCompose,
  handleReply,
  handleSelectEmail,
  closeCompose,
  starMutation,
  archiveMutation,
  deleteMutation,
  searchRef,
  setCommandBarOpen,
}: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandBarOpen(true);
        return;
      }

      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
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
            starMutation.mutate({
              id: selectedEmail.id,
              starred: !selectedEmail.starred,
            });
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
            handleSelectEmail(null);
          }
          break;
        case "j": {
          e.preventDefault();
          const currentIndex = emails.findIndex(
            (em) => em.id === selectedEmail?.id
          );
          if (currentIndex < emails.length - 1) {
            handleSelectEmail(emails[currentIndex + 1]);
          } else if (currentIndex === -1 && emails.length > 0) {
            handleSelectEmail(emails[0]);
          }
          break;
        }
        case "k": {
          e.preventDefault();
          const currentIdx = emails.findIndex(
            (em) => em.id === selectedEmail?.id
          );
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
  }, [
    selectedEmail,
    composing,
    emails,
    handleCompose,
    handleReply,
    handleSelectEmail,
    closeCompose,
    starMutation,
    archiveMutation,
    deleteMutation,
    searchRef,
    setCommandBarOpen,
  ]);
}
