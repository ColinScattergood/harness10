import { getCurrentUser } from "@/lib/auth";
import { getNote } from "@/lib/notes-queries";
import { redirect, notFound } from "next/navigation";
import { NoteEditor } from "@/components/note-editor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "Note - MarkdownNotes" };

  const note = await getNote(id, user.id);
  return {
    title: note ? `${note.title || "Untitled"} - MarkdownNotes` : "Note - MarkdownNotes",
  };
}

export default async function NoteEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const note = await getNote(id, user.id);
  if (!note) notFound();

  // If trashed, redirect to trash
  if (note.trashedAt) redirect("/notes/trash");

  return (
    <NoteEditor
      note={{
        id: note.id,
        title: note.title,
        body: note.body,
        isPinned: note.isPinned,
        isFavorite: note.isFavorite,
        wordCount: note.wordCount,
        updatedAt: note.updatedAt,
      }}
    />
  );
}
