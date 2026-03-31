"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  updateNoteAction,
  togglePinAction,
  toggleFavoriteAction,
  deleteNoteAction,
} from "@/lib/notes-actions";
import { MarkdownPreview } from "@/components/markdown-preview";

interface NoteEditorProps {
  note: {
    id: string;
    title: string;
    body: string;
    isPinned: boolean;
    isFavorite: boolean;
    wordCount: number;
    updatedAt: Date;
  };
}

function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function readingTime(wordCount: number): string {
  const minutes = Math.max(1, Math.round(wordCount / 200));
  return `${minutes} min read`;
}

export function NoteEditor({ note }: NoteEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>(note.updatedAt);
  const [isPinned, setIsPinned] = useState(note.isPinned);
  const [isFavorite, setIsFavorite] = useState(note.isFavorite);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = countWords(body);

  const saveNote = useCallback(
    async (newTitle: string, newBody: string) => {
      setSaving(true);
      try {
        await updateNoteAction(note.id, { title: newTitle, body: newBody });
        setLastSaved(new Date());
      } finally {
        setSaving(false);
      }
    },
    [note.id]
  );

  // Debounced auto-save
  const scheduleSave = useCallback(
    (newTitle: string, newBody: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveNote(newTitle, newBody);
      }, 1000);
    },
    [saveNote]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    scheduleSave(newTitle, body);
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBody = e.target.value;
    setBody(newBody);
    scheduleSave(title, newBody);
  };

  // Cmd+S immediate save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveNote(title, body);
      }
      // Cmd+Shift+P toggle preview
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setShowPreview((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [title, body, saveNote]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handlePin = async () => {
    setIsPinned(!isPinned);
    await togglePinAction(note.id);
  };

  const handleFavorite = async () => {
    setIsFavorite(!isFavorite);
    await toggleFavoriteAction(note.id);
  };

  const handleDelete = async () => {
    await deleteNoteAction(note.id);
    router.push("/notes");
  };

  const handleBack = () => {
    // Flush any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveNote(title, body);
    }
    router.push("/notes");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 py-2 md:px-4">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleBack}
            aria-label="Back to notes"
          >
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
              aria-hidden="true"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", isPinned && "text-primary")}
            onClick={handlePin}
            aria-label={isPinned ? "Unpin note" : "Pin note"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={isPinned ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", isFavorite && "text-yellow-500")}
            onClick={handleFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={isFavorite ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete note"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
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
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview toggle */}
          <Button
            variant={showPreview ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-8 text-xs"
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
              className="mr-1"
              aria-hidden="true"
            >
              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview
          </Button>

          {/* Save status */}
          <span className="text-xs text-muted-foreground">
            {saving ? "Saving..." : "Saved"}
          </span>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor pane */}
        <div
          className={cn(
            "flex flex-1 flex-col overflow-auto",
            showPreview && "hidden md:flex md:w-1/2 md:border-r"
          )}
        >
          <div className="px-4 pt-4 md:px-8 md:pt-6">
            <Input
              value={title}
              onChange={handleTitleChange}
              placeholder="Note title"
              className="border-none bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
              aria-label="Note title"
            />
          </div>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={handleBodyChange}
            placeholder="Start writing in markdown..."
            className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 md:px-8"
            style={{ lineHeight: "1.7" }}
            aria-label="Note content"
          />
        </div>

        {/* Preview pane */}
        {showPreview && (
          <div className="flex-1 overflow-auto px-4 py-4 md:w-1/2 md:px-8 md:py-6">
            <h1 className="mb-4 text-xl font-semibold">
              {title || "Untitled"}
            </h1>
            <MarkdownPreview content={body} />
          </div>
        )}
      </div>

      {/* Footer - word count & reading time */}
      <div className="flex items-center justify-between border-t px-4 py-1.5 md:px-6">
        <span className="text-xs text-muted-foreground">
          {wordCount} {wordCount === 1 ? "word" : "words"} · {readingTime(wordCount)}
        </span>
        <span className="text-xs text-muted-foreground">
          Last saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
