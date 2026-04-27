import { cookies } from "next/headers";
import { getAuthCookieName } from "@/lib/auth/jwt";

export async function setSessionCookie(token: string, maxAgeSeconds: number) {
  const cookieStore = await cookies();
  cookieStore.set(getAuthCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(getAuthCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(getAuthCookieName())?.value ?? null;
}

