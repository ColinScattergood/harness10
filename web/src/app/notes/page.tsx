import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotesList } from "@/components/notes-list";
import { getNotes } from "@/lib/notes-queries";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string; search?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const notesData = await getNotes(user.id, {
    filter: params.filter as "favorites" | undefined,
    sort: (params.sort as "updated" | "created" | "title") ?? "updated",
    search: params.search,
  });

  return (
    <NotesList
      notes={notesData}
      filter={params.filter}
      sort={params.sort ?? "updated"}
      search={params.search ?? ""}
    />
  );
}
