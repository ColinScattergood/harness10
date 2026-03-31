import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/sidebar";

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

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <AppSidebar userName={user.name} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
