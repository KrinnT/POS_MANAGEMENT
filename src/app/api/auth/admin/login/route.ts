import { prisma } from "@/lib/db";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookies";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  branchId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const { email, password, branchId } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return Response.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return Response.json({ error: "Invalid credentials" }, { status: 401 });

  const jti = crypto.randomUUID();
  const expiresInSeconds = 60 * 60 * 12; // 12h
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await prisma.session.create({
    data: { userId: user.id, branchId: branchId ?? user.branchId ?? null, jti, expiresAt },
  });

  const token = await signSessionToken(
    { sub: user.id, jti, branchId: (branchId ?? user.branchId ?? null) as string | null, role: user.role },
    expiresInSeconds,
  );

  await setSessionCookie(token, expiresInSeconds);
  return Response.json({ ok: true });
}

