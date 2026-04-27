import { prisma } from "@/lib/db";
import { getSessionCookie } from "@/lib/auth/cookies";
import { requireAuth } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionCookie();
  if (!token) return Response.json({ user: null }, { status: 200 });

  try {
    const auth = await requireAuth(token);
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, phone: true, email: true, role: true, branchId: true },
    });
    return Response.json({ user });
  } catch {
    return Response.json({ user: null }, { status: 200 });
  }
}

