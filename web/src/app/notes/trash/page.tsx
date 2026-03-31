import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTrashedNotes } from "@/lib/notes-queries";
import { TrashList } from "@/components/trash-list";

export const metadata = {
  title: "Trash - MarkdownNotes",
};

export default async function TrashPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const trashedNotes = await getTrashedNotes(user.id);

  return <TrashList notes={trashedNotes} />;
}
