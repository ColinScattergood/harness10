import { SignUpForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign Up - MarkdownNotes",
};

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/notes");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUpForm />
    </div>
  );
}
