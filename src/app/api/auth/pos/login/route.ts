import { prisma } from "@/lib/db";
import { z } from "zod";
import { signSessionToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookies";

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
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user?.passcode) return Response.json({ error: "Invalid credentials" }, { status: 401 });
  if (user.passcode !== pin) return Response.json({ error: "Invalid credentials" }, { status: 401 });

  const jti = crypto.randomUUID();
  const expiresInSeconds = 60 * 60 * 12; // 12h
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  await prisma.session.create({
    data: { userId: user.id, branchId, jti, expiresAt },
  });

  const token = await signSessionToken({ sub: user.id, jti, branchId, role: user.role }, expiresInSeconds);
  await setSessionCookie(token, expiresInSeconds);

  return Response.json({ ok: true });
}

