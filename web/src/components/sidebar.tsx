"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/lib/actions";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useTransition } from "react";
import {
  createFolderAction,
  renameFolderAction,
  deleteFolderAction,
} from "@/lib/folders-actions";

interface FolderItem {
  id: string;
  name: string;
}

interface SidebarProps {
  userName: string;
  folders: FolderItem[];
}

const navItems = [
  {
    label: "All Notes",
    href: "/notes",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
        <path d="M15 3v4a2 2 0 0 0 2 2h4" />
      </svg>
    ),
  },
  {
    label: "Favorites",
    href: "/notes?filter=favorites",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    label: "Trash",
    href: "/notes/trash",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" x2="10" y1="11" y2="17" />
        <line x1="14" x2="14" y1="11" y2="17" />
      </svg>
    ),
  },
];

// Folder icon
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

function SidebarContent({
  userName,
  folders,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderName, setRenameFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);

  const isActive = (href: string) => {
    if (href === "/notes" && !href.includes("?")) {
      return pathname === "/notes" && !searchParams.has("filter") && !searchParams.has("folderId");
    }
    if (href.includes("filter=favorites")) {
      return pathname === "/notes" && searchParams.get("filter") === "favorites";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isFolderActive = (folderId: string) => {
    return pathname === "/notes" && searchParams.get("folderId") === folderId;
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    startTransition(async () => {
      await createFolderAction(newFolderName);
      setNewFolderName("");
      setShowCreateDialog(false);
      router.refresh();
    });
  };

  const handleRenameFolder = async () => {
    if (!selectedFolder || !renameFolderName.trim()) return;
    startTransition(async () => {
      await renameFolderAction(selectedFolder.id, renameFolderName);
      setShowRenameDialog(false);
      setSelectedFolder(null);
      setRenameFolderName("");
      router.refresh();
    });
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;
    startTransition(async () => {
      await deleteFolderAction(selectedFolder.id);
      setShowDeleteDialog(false);
      setSelectedFolder(null);
      // If we were viewing this folder, go back to all notes
      if (searchParams.get("folderId") === selectedFolder.id) {
        router.push("/notes");
      }
      router.refresh();
    });
  };

  const openRenameDialog = (folder: FolderItem) => {
    setSelectedFolder(folder);
    setRenameFolderName(folder.name);
    setShowRenameDialog(true);
  };

  const openDeleteDialog = (folder: FolderItem) => {
    setSelectedFolder(folder);
    setShowDeleteDialog(true);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
          aria-hidden="true"
        >
          <path d="M12 3 2 12h3v9h6v-6h2v6h6v-9h3Z" />
        </svg>
        <span className="text-lg font-semibold tracking-tight">
          MarkdownNotes
        </span>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Folders section */}
        <div className="mt-4">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Folders
            </span>
            <button
              onClick={() => {
                setNewFolderName("");
                setShowCreateDialog(true);
              }}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Create new folder"
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
                <line x1="12" x2="12" y1="5" y2="19" />
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
            </button>
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            {folders.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground/70">
                No folders yet
              </p>
            ) : (
              folders.map((folder) => (
                <div key={folder.id} className="group flex items-center">
                  <Link
                    href={`/notes?folderId=${folder.id}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors min-w-0",
                      isFolderActive(folder.id)
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                    )}
                  >
                    <FolderIcon />
                    <span className="truncate">{folder.name}</span>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="mr-1 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent focus:opacity-100"
                      aria-label={`Folder options for ${folder.name}`}
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
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openRenameDialog(folder)}
                      >
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(folder)}
                        className="text-destructive focus:text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      <Separator />

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-sm text-muted-foreground">
            {userName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action={signOutAction}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              type="submit"
              aria-label="Sign out"
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </Button>
          </form>
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateFolder();
            }}
          >
            <Input
              autoFocus
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="mb-4"
              aria-label="Folder name"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newFolderName.trim() || isPending}>
                {isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRenameFolder();
            }}
          >
            <Input
              autoFocus
              placeholder="Folder name"
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              className="mb-4"
              aria-label="New folder name"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRenameDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!renameFolderName.trim() || isPending}
              >
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              The folder &ldquo;{selectedFolder?.name}&rdquo; will be deleted.
              Notes inside this folder will be moved to the root level, not to
              trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AppSidebar({ userName, folders }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile: hamburger + sheet */}
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background px-4 py-3 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
            aria-label="Open navigation menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent
              userName={userName}
              folders={folders}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold">MarkdownNotes</span>
      </div>

      {/* Desktop: persistent sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:bg-background">
        <SidebarContent userName={userName} folders={folders} />
      </aside>
    </>
  );
}
