import { prisma } from "@/lib/db";
import { getSessionCookie, clearSessionCookie } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";

export async function POST() {
  const token = await getSessionCookie();
  if (token) {
    try {
      const payload = await verifySessionToken(token);
      const jti = payload.jti;
      if (typeof jti === "string") {
        await prisma.session.updateMany({
          where: { jti, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    } catch {
      // ignore
    }
  }
  await clearSessionCookie();
  return Response.json({ ok: true });
}

