import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "pos_session";
const globalForAuth = globalThis as unknown as { __posAuthSecret?: Uint8Array };

export function getAuthCookieName() {
  return COOKIE_NAME;
}

function getSecret() {
  const secret = process.env["AUTH_SECRET"];
  if (secret) return new TextEncoder().encode(secret);

  // Developer experience: allow local runs without an env file.
  // In production we still require an explicit secret.
  if (process.env["NODE_ENV"] !== "production") {
    if (!globalForAuth.__posAuthSecret) {
      globalForAuth.__posAuthSecret = new TextEncoder().encode(crypto.randomUUID());
      console.warn("AUTH_SECRET is not set; using a random development secret for this process.");
    }
    return globalForAuth.__posAuthSecret;
  }

  throw new Error("AUTH_SECRET is not set");
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
