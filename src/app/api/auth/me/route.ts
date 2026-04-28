import { prisma } from "@/lib/db";
import { getSessionCookie } from "@/lib/auth/cookies";
import { requireAuth } from "@/lib/auth/session";
import { parseRole } from "@/lib/auth/roles";
import { listPermissions } from "@/lib/auth/rbac";

export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionCookie();
  if (!token) return Response.json({ user: null }, { status: 200 });

  try {
    const auth = await requireAuth(token);
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: { role: true },
    });
    if (!user) return Response.json({ user: null }, { status: 200 });
    const role = parseRole(user.role.name);
    if (!role) return Response.json({ user: null }, { status: 200 });

    return Response.json({ 
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        branchId: user.branchId,
        role,
        permissions: listPermissions(role),
      },
    });
  } catch {
    return Response.json({ user: null }, { status: 200 });
  }
}
