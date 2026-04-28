import { prisma } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth/jwt";
import type { Role } from "@prisma/client";
import { parseRole } from "@/lib/auth/roles";

export type AuthContext = {
  userId: string;
  role: Role;
  branchId: string | null;
};

export async function requireAuth(token: string): Promise<AuthContext> {
  const payload = await verifySessionToken(token);
  const userId = payload.sub;
  const jti = payload.jti;
  const tokenRole = parseRole(payload.role);
  const branchId = (payload.branchId as string | undefined) ?? null;

  if (typeof userId !== "string" || typeof jti !== "string" || !tokenRole) {
    throw new Error("Invalid session token");
  }

  const session = await prisma.session.findUnique({
    where: { jti },
    select: {
      expiresAt: true,
      userId: true,
      user: {
        select: {
          branchId: true,
          role: { select: { name: true } },
        },
      },
    },
  });
  if (!session) throw new Error("Session revoked");
  if (session.userId !== userId) throw new Error("Session mismatch");
  if (session.expiresAt.getTime() < Date.now()) throw new Error("Session expired");

  const persistedRole = parseRole(session.user.role.name);
  const role = (persistedRole ?? tokenRole) as Role;

  return { userId, role, branchId: session.user.branchId ?? branchId };
}
