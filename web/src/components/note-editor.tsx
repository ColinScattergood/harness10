"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  updateNoteAction,
  togglePinAction,
  toggleFavoriteAction,
  deleteNoteAction,
} from "@/lib/notes-actions";
import { moveNoteToFolderAction } from "@/lib/folders-actions";
import { MarkdownPreview } from "@/components/markdown-preview";

interface FolderItem {
  id: string;
  name: string;
}

interface NoteEditorProps {
  note: {
    id: string;
    title: string;
    body: string;
    isPinned: boolean;
    isFavorite: boolean;
    wordCount: number;
    updatedAt: Date;
    folderId: string | null;
  };
  folders: FolderItem[];
}

function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function readingTime(wordCount: number): string {
  const minutes = Math.max(1, Math.round(wordCount / 200));
  return `${minutes} min read`;
}

// Markdown toolbar formatting helpers
type FormatAction = {
  label: string;
  icon: React.ReactNode;
  action: (
    textarea: HTMLTextAreaElement,
    body: string,
    setBody: (b: string) => void
  ) => void;
  ariaLabel: string;
};

function wrapSelection(
  textarea: HTMLTextAreaElement,
  body: string,
  setBody: (b: string) => void,
  before: string,
  after: string,
  placeholder: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = body.slice(start, end) || placeholder;
  const newText = body.slice(0, start) + before + selected + after + body.slice(end);
  setBody(newText);

  // Set cursor position after React re-render
  requestAnimationFrame(() => {
    textarea.focus();
    const newStart = start + before.length;
    const newEnd = newStart + selected.length;
    textarea.setSelectionRange(newStart, newEnd);
  });
}

function insertAtLineStart(
  textarea: HTMLTextAreaElement,
  body: string,
  setBody: (b: string) => void,
  prefix: string
) {
  const start = textarea.selectionStart;
  // Find beginning of current line
  const lineStart = body.lastIndexOf("\n", start - 1) + 1;
  const newText = body.slice(0, lineStart) + prefix + body.slice(lineStart);
  setBody(newText);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + prefix.length, start + prefix.length);
  });
}

const formatActions: FormatAction[] = [
  {
    label: "Bold",
    ariaLabel: "Insert bold text",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
      </svg>
    ),
    action: (ta, body, setBody) =>
      wrapSelection(ta, body, setBody, "**", "**", "bold text"),
  },
  {
    label: "Italic",
    ariaLabel: "Insert italic text",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" x2="10" y1="4" y2="4" />
        <line x1="14" x2="5" y1="20" y2="20" />
        <line x1="15" x2="9" y1="4" y2="20" />
      </svg>
    ),
    action: (ta, body, setBody) =>
      wrapSelection(ta, body, setBody, "*", "*", "italic text"),
  },
  {
    label: "Heading",
    ariaLabel: "Insert heading",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 12h12" />
        <path d="M6 20V4" />
        <path d="M18 20V4" />
      </svg>
    ),
    action: (ta, body, setBody) =>
      insertAtLineStart(ta, body, setBody, "## "),
  },
  {
    label: "Link",
    ariaLabel: "Insert link",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    action: (ta, body, setBody) => {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = body.slice(start, end) || "link text";
      const newText =
        body.slice(0, start) + `[${selected}](url)` + body.slice(end);
      setBody(newText);
      requestAnimationFrame(() => {
        ta.focus();
        // Select "url" so user can type the URL
        const urlStart = start + selected.length + 3;
        ta.setSelectionRange(urlStart, urlStart + 3);
      });
    },
  },
  {
    label: "Code",
    ariaLabel: "Insert inline code",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    action: (ta, body, setBody) =>
      wrapSelection(ta, body, setBody, "`", "`", "code"),
  },
  {
    label: "List",
    ariaLabel: "Insert bullet list",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" x2="21" y1="6" y2="6" />
        <line x1="8" x2="21" y1="12" y2="12" />
        <line x1="8" x2="21" y1="18" y2="18" />
        <line x1="3" x2="3.01" y1="6" y2="6" />
        <line x1="3" x2="3.01" y1="12" y2="12" />
        <line x1="3" x2="3.01" y1="18" y2="18" />
      </svg>
    ),
    action: (ta, body, setBody) =>
      insertAtLineStart(ta, body, setBody, "- "),
  },
];

export function NoteEditor({ note, folders }: NoteEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>(note.updatedAt);
  const [isPinned, setIsPinned] = useState(note.isPinned);
  const [isFavorite, setIsFavorite] = useState(note.isFavorite);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    note.folderId
  );
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S immediate save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveNote(title, body);
      }
      // Cmd+Shift+P toggle preview
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "p" || e.key === "P")) {
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

  const handleMoveToFolder = async (folderId: string | null) => {
    setCurrentFolderId(folderId);
    await moveNoteToFolderAction(note.id, folderId);
    router.refresh();
  };

  const handleExport = () => {
    const fileName = (title || "Untitled").replace(/[^a-zA-Z0-9-_ ]/g, "") + ".md";
    const content = `# ${title || "Untitled"}\n\n${body}`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentFolderName = folders.find(
    (f) => f.id === currentFolderId
  )?.name;

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

          {/* Move to folder */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-8 w-8"
              aria-label="Move to folder"
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
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              </svg>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => handleMoveToFolder(null)}
                className={cn(!currentFolderId && "font-medium")}
              >
                No Folder
                {!currentFolderId && (
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
                    className="ml-auto"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </DropdownMenuItem>
              {folders.length > 0 && <DropdownMenuSeparator />}
              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onClick={() => handleMoveToFolder(folder.id)}
                  className={cn(
                    currentFolderId === folder.id && "font-medium"
                  )}
                >
                  {folder.name}
                  {currentFolderId === folder.id && (
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
                      className="ml-auto"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleExport}
            aria-label="Export as markdown file"
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
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
          {currentFolderName && (
            <span className="hidden text-xs text-muted-foreground sm:inline-flex items-center gap-1">
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
                aria-hidden="true"
              >
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              </svg>
              {currentFolderName}
            </span>
          )}
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

      {/* Markdown Toolbar */}
      <div className="flex items-center gap-0.5 border-b px-3 py-1 md:px-4">
        {formatActions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              if (bodyRef.current) {
                action.action(bodyRef.current, body, (newBody) => {
                  setBody(newBody);
                  scheduleSave(title, newBody);
                });
              }
            }}
            aria-label={action.ariaLabel}
            title={action.label}
          >
            {action.icon}
          </Button>
        ))}
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
          {wordCount} {wordCount === 1 ? "word" : "words"} &middot;{" "}
          {readingTime(wordCount)}
        </span>
        <span className="text-xs text-muted-foreground">
          Last saved{" "}
          {lastSaved.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
