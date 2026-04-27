import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "pos_session";

export function getAuthCookieName() {
  return COOKIE_NAME;
}

function getSecret() {
  const secret = process.env["AUTH_SECRET"];
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type SessionToken = {
  sub: string; // userId
  jti: string;
  branchId: string | null;
  role: string;
};

export async function signSessionToken(payload: SessionToken, expiresInSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    role: payload.role,
    branchId: payload.branchId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .setSubject(payload.sub)
    .setJti(payload.jti)
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
  return payload;
}

