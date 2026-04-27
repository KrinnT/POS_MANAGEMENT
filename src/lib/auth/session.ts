import { prisma } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth/jwt";
import type { Role } from "@prisma/client";

export type AuthContext = {
  userId: string;
  role: Role;
  branchId: string | null;
};

export async function requireAuth(token: string): Promise<AuthContext> {
  const payload = await verifySessionToken(token);
  const userId = payload.sub;
  const jti = payload.jti;
  const role = payload.role;
  const branchId = (payload.branchId as string | undefined) ?? null;

  if (typeof userId !== "string" || typeof jti !== "string" || typeof role !== "string") {
    throw new Error("Invalid session token");
  }

  const session = await prisma.session.findUnique({
    where: { jti },
    select: { revokedAt: true, expiresAt: true, userId: true, branchId: true },
  });
  if (!session || session.revokedAt) throw new Error("Session revoked");
  if (session.userId !== userId) throw new Error("Session mismatch");
  if (session.expiresAt.getTime() < Date.now()) throw new Error("Session expired");

  return { userId, role: role as Role, branchId: session.branchId ?? branchId };
}

