import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "mn_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Simple in-memory session store (for local dev with SQLite)
// In production, sessions would be stored in a database
const sessions = new Map<string, { userId: string; expiresAt: number }>();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = generateSessionToken();
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;

  sessions.set(token, { userId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<{
  userId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return { userId: session.userId };
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      theme: users.theme,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .get();

  return user ?? null;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    sessions.delete(token);
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const existing = db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();

  if (existing) {
    return { success: false, error: "An account with this email already exists" };
  }

  const id = uuidv4();
  const passwordHash = await hashPassword(password);

  db.insert(users)
    .values({
      id,
      email: email.toLowerCase(),
      name,
      passwordHash,
      theme: "dark",
    })
    .run();

  await createSession(id);
  return { success: true };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const user = db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();

  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Invalid email or password" };
  }

  await createSession(user.id);
  return { success: true };
}
