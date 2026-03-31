import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/sidebar";
import { ThemeSyncer } from "@/components/theme-syncer";
import { getFolders } from "@/lib/folders-queries";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

export const metadata = {
  title: "Notes - MarkdownNotes",
};

export default async function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const folders = await getFolders(user.id);

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <ThemeSyncer theme={user.theme} />
      <KeyboardShortcuts />
      <AppSidebar
        userName={user.name}
        folders={folders.map((f) => ({ id: f.id, name: f.name }))}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
