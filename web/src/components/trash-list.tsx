"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { restoreNoteAction, permanentDeleteNoteAction } from "@/lib/notes-actions";
import type { NoteListItem } from "@/lib/notes-queries";

interface TrashListProps {
  notes: NoteListItem[];
}

function formatTrashedDate(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const daysLeft = 30 - Math.floor(diff / 86400000);
  if (daysLeft <= 0) return "Expires soon";
  return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
}

export function TrashList({ notes }: TrashListProps) {
  const router = useRouter();

  const handleRestore = async (noteId: string) => {
    await restoreNoteAction(noteId);
    router.refresh();
  };

  const handlePermanentDelete = async (noteId: string) => {
    await permanentDeleteNoteAction(noteId);
    router.refresh();
  };

  if (notes.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center border-b px-4 py-3 md:px-6">
          <h1 className="text-lg font-semibold">Trash</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <Card className="flex max-w-md flex-col items-center gap-4 border-dashed p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Trash is empty</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Deleted notes will appear here for 30 days before being
                permanently removed.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3 md:px-6">
        <h1 className="text-lg font-semibold">Trash</h1>
        <span className="text-xs text-muted-foreground">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>
      </div>

      <div className="flex-1 overflow-auto divide-y">
        {notes.map((note) => (
          <div
            key={note.id}
            className="flex items-center justify-between gap-3 px-4 py-3 md:px-6"
          >
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium">
                {note.title || "Untitled"}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatTrashedDate(note.trashedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestore(note.id)}
                className="h-7 text-xs"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Restore
              </Button>
              <AlertDialog>
                <AlertDialogTrigger
                  className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Delete
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Permanently delete note?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The note &ldquo;{note.title || "Untitled"}&rdquo; will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handlePermanentDelete(note.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
