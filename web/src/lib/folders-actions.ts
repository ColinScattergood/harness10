"use server";

import { db } from "@/db";
import { folders, notes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

export async function createFolderAction(
  name: string
): Promise<{ id: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  if (!name || !name.trim()) {
    return { error: "Folder name is required" };
  }

  const id = uuidv4();
  const now = new Date();

  // Get max position
  const existing = db
    .select({ position: folders.position })
    .from(folders)
    .where(eq(folders.userId, user.id))
    .all();

  const maxPosition = existing.reduce(
    (max, f) => Math.max(max, f.position),
    -1
  );

  db.insert(folders)
    .values({
      id,
      userId: user.id,
      name: name.trim(),
      position: maxPosition + 1,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  revalidatePath("/notes");
  return { id };
}

export async function renameFolderAction(
  folderId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  if (!name || !name.trim()) {
    return { success: false, error: "Folder name is required" };
  }

  const folder = db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, user.id)))
    .get();

  if (!folder) return { success: false, error: "Folder not found" };

  db.update(folders)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(folders.id, folderId))
    .run();

  revalidatePath("/notes");
  return { success: true };
}

export async function deleteFolderAction(
  folderId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const folder = db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, user.id)))
    .get();

  if (!folder) return { success: false, error: "Folder not found" };

  // Move all notes in this folder to root (set folderId to null)
  // This happens automatically via ON DELETE SET NULL in the schema,
  // but let's be explicit for clarity
  db.update(notes)
    .set({ folderId: null, updatedAt: new Date() })
    .where(and(eq(notes.folderId, folderId), eq(notes.userId, user.id)))
    .run();

  db.delete(folders).where(eq(folders.id, folderId)).run();

  revalidatePath("/notes");
  return { success: true };
}

export async function moveNoteToFolderAction(
  noteId: string,
  folderId: string | null
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify note belongs to user
  const note = db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .get();

  if (!note) return { success: false, error: "Note not found" };

  // Verify folder belongs to user (if not null)
  if (folderId) {
    const folder = db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, user.id)))
      .get();

    if (!folder) return { success: false, error: "Folder not found" };
  }

  db.update(notes)
    .set({ folderId, updatedAt: new Date() })
    .where(eq(notes.id, noteId))
    .run();

  revalidatePath("/notes");
  return { success: true };
}
