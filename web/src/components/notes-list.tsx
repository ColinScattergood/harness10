"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  createNoteAction,
  togglePinAction,
  toggleFavoriteAction,
  deleteNoteAction,
} from "@/lib/notes-actions";
import { moveNoteToFolderAction } from "@/lib/folders-actions";
import type { NoteListItem } from "@/lib/notes-queries";

interface NotesListProps {
  notes: NoteListItem[];
  filter?: string;
  sort: string;
  search: string;
  folderId?: string;
  folderName?: string;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getPreview(body: string, maxLength = 120): string {
  const stripped = body
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/[-*+]\s+/g, "")
    .replace(/\n+/g, " ")
    .trim();
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength).trimEnd() + "...";
}

export function NotesList({
  notes,
  filter,
  sort,
  search,
  folderId,
  folderName,
}: NotesListProps) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);
  const [isPending, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParamsHook.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/notes?${params.toString()}`);
    },
    [router, searchParamsHook]
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      startTransition(() => {
        updateParams({ search: value || undefined });
      });
    },
    [updateParams]
  );

  const handleSort = useCallback(
    (newSort: string) => {
      startTransition(() => {
        updateParams({ sort: newSort === "updated" ? undefined : newSort });
      });
    },
    [updateParams]
  );

  const handleCreateNote = async () => {
    await createNoteAction();
  };

  const handlePin = async (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await togglePinAction(noteId);
    router.refresh();
  };

  const handleFavorite = async (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleFavoriteAction(noteId);
    router.refresh();
  };

  const handleDelete = async (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteNoteAction(noteId);
    router.refresh();
  };

  const sortLabel =
    sort === "created" ? "Created" : sort === "title" ? "Title" : "Modified";

  const title = folderName
    ? folderName
    : filter === "favorites"
      ? "Favorites"
      : "All Notes";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 md:px-6">
        <h1 className="text-lg font-semibold">{title}</h1>
        <form action={handleCreateNote}>
          <Button size="sm" type="submit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
              aria-hidden="true"
            >
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            New Note
          </Button>
        </form>
      </div>

      {/* Search & Sort Bar */}
      <div className="flex items-center gap-2 border-b px-4 py-2 md:px-6">
        <div className="relative flex-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            type="search"
            placeholder="Search notes..."
            className="pl-8 h-9"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search notes"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m3 16 4 4 4-4" />
              <path d="M7 20V4" />
              <path d="M11 4h10" />
              <path d="M11 8h7" />
              <path d="M11 12h4" />
            </svg>
            {sortLabel}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSort("updated")}>
              Date Modified
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("created")}>
              Date Created
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("title")}>
              Title
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-auto">
        {notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6">
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
                  <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
                  <path d="M15 3v4a2 2 0 0 0 2 2h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {search
                    ? "No matching notes"
                    : filter === "favorites"
                      ? "No favorites yet"
                      : folderName
                        ? "No notes in this folder"
                        : "No notes yet"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search
                    ? "Try a different search term."
                    : filter === "favorites"
                      ? "Star a note to see it here."
                      : folderName
                        ? "Move a note into this folder to see it here."
                        : "Create your first note to get started."}
                </p>
              </div>
            </Card>
          </div>
        ) : (
          <div className="divide-y">
            {notes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50 md:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {note.isPinned && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 text-primary"
                        aria-label="Pinned"
                      >
                        <path d="M12 17v5" />
                        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
                      </svg>
                    )}
                    <h3 className="truncate text-sm font-medium">
                      {note.title || "Untitled"}
                    </h3>
                    {note.isFavorite && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 text-yellow-500"
                        aria-label="Favorited"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    )}
                  </div>
                  {note.body && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {getPreview(note.body)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {formatDate(note.updatedAt)}
                    {note.wordCount > 0 && ` \u00b7 ${note.wordCount} words`}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => handlePin(e, note.id)}
                    className={cn(
                      "rounded p-1.5 transition-colors hover:bg-accent",
                      note.isPinned
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                    aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={note.isPinned ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 17v5" />
                      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleFavorite(e, note.id)}
                    className={cn(
                      "rounded p-1.5 transition-colors hover:bg-accent",
                      note.isFavorite
                        ? "text-yellow-500"
                        : "text-muted-foreground"
                    )}
                    aria-label={
                      note.isFavorite
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={note.isFavorite ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, note.id)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete note"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
