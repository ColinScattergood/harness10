import { db } from "@/db";
import { folders } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import type { Folder } from "@/db/schema";

export async function getFolders(userId: string): Promise<Folder[]> {
  return db
    .select()
    .from(folders)
    .where(eq(folders.userId, userId))
    .orderBy(asc(folders.position), asc(folders.name))
    .all();
}

export async function getFolder(
  folderId: string,
  userId: string
): Promise<Folder | null> {
  const folder = db
    .select()
    .from(folders)
    .where(eq(folders.id, folderId))
    .get();

  if (!folder || folder.userId !== userId) return null;
  return folder;
}
