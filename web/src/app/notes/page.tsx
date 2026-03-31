import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotesList } from "@/components/notes-list";
import { getNotes } from "@/lib/notes-queries";
import { getFolder } from "@/lib/folders-queries";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    sort?: string;
    search?: string;
    folderId?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;

  // Get folder name if filtering by folder
  let folderName: string | undefined;
  if (params.folderId) {
    const folder = await getFolder(params.folderId, user.id);
    if (folder) {
      folderName = folder.name;
    }
  }

  const notesData = await getNotes(user.id, {
    filter: params.filter as "favorites" | undefined,
    sort: (params.sort as "updated" | "created" | "title") ?? "updated",
    search: params.search,
    folderId: params.folderId,
  });

  return (
    <NotesList
      notes={notesData}
      filter={params.filter}
      sort={params.sort ?? "updated"}
      search={params.search ?? ""}
      folderId={params.folderId}
      folderName={folderName}
    />
  );
}
