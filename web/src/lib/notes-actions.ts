"use server";

import { db } from "@/db";
import { notes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export async function createNoteAction(): Promise<{ id: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const id = uuidv4();
  const now = new Date();

  db.insert(notes)
    .values({
      id,
      userId: user.id,
      title: "Untitled",
      body: "",
      wordCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  revalidatePath("/notes");
  redirect(`/notes/${id}`);
}

export async function updateNoteAction(
  noteId: string,
  data: { title?: string; body?: string; folderId?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const note = db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .get();

  if (!note) return { success: false, error: "Note not found" };

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (data.title !== undefined) updates.title = data.title;
  if (data.body !== undefined) {
    updates.body = data.body;
    updates.wordCount = countWords(data.body);
  }
  if (data.folderId !== undefined) updates.folderId = data.folderId;

  db.update(notes)
    .set(updates)
    .where(eq(notes.id, noteId))
    .run();

  revalidatePath("/notes");
  return { success: true };
}

export async function togglePinAction(noteId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const note = db
    .select({ isPinned: notes.isPinned })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .get();

  if (!note) return;

  db.update(notes)
    .set({ isPinned: !note.isPinned, updatedAt: new Date() })
    .where(eq(notes.id, noteId))
    .run();

  revalidatePath("/notes");
}

export async function toggleFavoriteAction(noteId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const note = db
    .select({ isFavorite: notes.isFavorite })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .get();

  if (!note) return;

  db.update(notes)
    .set({ isFavorite: !note.isFavorite, updatedAt: new Date() })
    .where(eq(notes.id, noteId))
    .run();

  revalidatePath("/notes");
}

export async function deleteNoteAction(noteId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  db.update(notes)
    .set({ trashedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .run();

  revalidatePath("/notes");
  revalidatePath("/notes/trash");
}

export async function restoreNoteAction(noteId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  db.update(notes)
    .set({ trashedAt: null })
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .run();

  revalidatePath("/notes");
  revalidatePath("/notes/trash");
}

export async function permanentDeleteNoteAction(noteId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  db.delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .run();

  revalidatePath("/notes/trash");
}
