"use server";

import { signUp, signIn, destroySession, getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function signUpAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await signUp(parsed.data.email, parsed.data.password, parsed.data.name);
  if (!result.success) {
    return { error: result.error };
  }

  redirect("/notes");
}

export async function signInAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await signIn(parsed.data.email, parsed.data.password);
  if (!result.success) {
    return { error: result.error };
  }

  redirect("/notes");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/sign-in");
}

export async function updateThemeAction(theme: "dark" | "light"): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  db.update(users)
    .set({ theme })
    .where(eq(users.id, user.id))
    .run();
}
