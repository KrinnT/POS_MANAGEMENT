import { prisma } from "@/lib/db";
import { getSessionCookie } from "@/lib/auth/cookies";
import { requireAuth } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { z } from "zod";
import { Role } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionCookie();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const auth = await requireAuth(token);
  if (!can(auth.role, "staff.read")) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const users = await prisma.user.findMany({
    where: { branchId: auth.branchId },
    select: { id: true, phone: true, email: true, role: true, branchId: true },
    orderBy: { phone: "asc" },
  });
  return Response.json({ users });
}

const CreateSchema = z.object({
  phone: z.string().min(6),
  email: z.string().email().nullable().optional(),
  role: z.nativeEnum(Role),
  pin: z.string().min(4),
});

export async function POST(request: Request) {
  const token = await getSessionCookie();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const auth = await requireAuth(token);
  if (!can(auth.role, "staff.write")) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const user = await prisma.user.create({
    data: {
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      role: parsed.data.role,
      passcode: parsed.data.pin,
      branchId: auth.branchId,
    },
    select: { id: true, phone: true, email: true, role: true, branchId: true },
  });

  await prisma.auditLog.create({
    data: {
      branchId: auth.branchId,
      userId: auth.userId,
      action: "staff.create",
      entity: "User",
      entityId: user.id,
      metadata: { phone: user.phone, role: user.role },
    },
  });

  return Response.json({ user });
}

