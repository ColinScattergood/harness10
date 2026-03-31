import { db } from "@/db";
import { notes } from "@/db/schema";
import { eq, and, isNull, isNotNull, like, or, desc, asc } from "drizzle-orm";
import type { Note } from "@/db/schema";

export type NoteListItem = Pick<
  Note,
  "id" | "title" | "body" | "isPinned" | "isFavorite" | "wordCount" | "createdAt" | "updatedAt" | "folderId" | "trashedAt"
>;

interface GetNotesOptions {
  filter?: "favorites";
  sort?: "updated" | "created" | "title";
  search?: string;
  folderId?: string;
}

export async function getNotes(
  userId: string,
  options: GetNotesOptions = {}
): Promise<NoteListItem[]> {
  const { filter, sort = "updated", search, folderId } = options;

  const conditions = [eq(notes.userId, userId), isNull(notes.trashedAt)];

  if (filter === "favorites") {
    conditions.push(eq(notes.isFavorite, true));
  }

  if (folderId) {
    conditions.push(eq(notes.folderId, folderId));
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(like(notes.title, term), like(notes.body, term))!
    );
  }

  let orderBy;
  switch (sort) {
    case "created":
      orderBy = desc(notes.createdAt);
      break;
    case "title":
      orderBy = asc(notes.title);
      break;
    default:
      orderBy = desc(notes.updatedAt);
  }

  const result = db
    .select({
      id: notes.id,
      title: notes.title,
      body: notes.body,
      isPinned: notes.isPinned,
      isFavorite: notes.isFavorite,
      wordCount: notes.wordCount,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      folderId: notes.folderId,
      trashedAt: notes.trashedAt,
    })
    .from(notes)
    .where(and(...conditions))
    .orderBy(desc(notes.isPinned), orderBy)
    .all();

  return result;
}

export async function getNote(
  noteId: string,
  userId: string
): Promise<Note | null> {
  const note = db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .get();

  return note ?? null;
}

export async function getTrashedNotes(userId: string): Promise<NoteListItem[]> {
  const result = db
    .select({
      id: notes.id,
      title: notes.title,
      body: notes.body,
      isPinned: notes.isPinned,
      isFavorite: notes.isFavorite,
      wordCount: notes.wordCount,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      folderId: notes.folderId,
      trashedAt: notes.trashedAt,
    })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNotNull(notes.trashedAt)))
    .orderBy(desc(notes.trashedAt))
    .all();

  return result;
}
