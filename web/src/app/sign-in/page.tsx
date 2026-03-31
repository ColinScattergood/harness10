import { SignInForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign In - MarkdownNotes",
};

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect("/notes");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignInForm />
    </div>
  );
}
