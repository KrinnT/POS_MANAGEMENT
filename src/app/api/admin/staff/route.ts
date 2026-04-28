import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guard";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requirePermission("staff.read");
  if (!guard.ok) return guard.response;
  const auth = guard.auth;
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
  roleName: z.string(), // e.g. "CASHIER", "MANAGER"
  pin: z.string().min(4),
});

export async function POST(request: Request) {
  const guard = await requirePermission("staff.write");
  if (!guard.ok) return guard.response;
  const auth = guard.auth;
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const role = await prisma.userRole.findUnique({ where: { name: parsed.data.roleName } });
  if (!role) return Response.json({ error: "Role not found" }, { status: 400 });

  const user = await prisma.user.create({
    data: {
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      roleId: role.id,
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
      newValue: { phone: user.phone, role: user.role.name },
    },
  });

  return Response.json({ user });
}
