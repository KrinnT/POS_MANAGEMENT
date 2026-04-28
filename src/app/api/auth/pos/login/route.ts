import { prisma } from "@/lib/db";
import { z } from "zod";
import { signSessionToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookies";
import { canLoginPosChannel, isBranchScopeAllowed } from "@/lib/auth/policy";
import { parseRole } from "@/lib/auth/roles";

export const runtime = "nodejs";

const BodySchema = z.object({
  phone: z.string().min(6),
  pin: z.string().min(4),
  branchId: z.string().uuid(),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const { phone, pin, branchId } = parsed.data;
  const user = await prisma.user.findUnique({ 
    where: { phone },
    include: { role: true }
  });
  if (!user?.passcode || !user.role) return Response.json({ error: "Invalid credentials" }, { status: 401 });
  if (user.passcode !== pin) return Response.json({ error: "Invalid credentials" }, { status: 401 });
  const role = parseRole(user.role.name);
  if (!role) return Response.json({ error: "Invalid role" }, { status: 403 });
  if (!canLoginPosChannel(role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!isBranchScopeAllowed({ userBranchId: user.branchId ?? null, requestedBranchId: branchId })) {
    return Response.json({ error: "Branch access denied" }, { status: 403 });
  }

  const jti = crypto.randomUUID();
  const expiresInSeconds = 60 * 60 * 12; // 12h
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  await prisma.session.create({
    data: { userId: user.id, jti, expiresAt },
  });

  const token = await signSessionToken({ sub: user.id, jti, branchId, role }, expiresInSeconds);
  await setSessionCookie(token, expiresInSeconds);

  return Response.json({ ok: true });
}
