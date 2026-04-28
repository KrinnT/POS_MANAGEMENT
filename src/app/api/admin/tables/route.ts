import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guard";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requirePermission("table.read");
  if (!guard.ok) return guard.response;
  const auth = guard.auth;
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const tables = await prisma.table.findMany({
    where: { branchId: auth.branchId },
    orderBy: { name: "asc" },
  });
  return Response.json({ tables });
}

const CreateSchema = z.object({
  name: z.string().min(1),
  qrToken: z.string().min(2),
});

export async function POST(request: Request) {
  const guard = await requirePermission("table.write");
  if (!guard.ok) return guard.response;
  const auth = guard.auth;
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const table = await prisma.table.create({
    data: { branchId: auth.branchId, name: parsed.data.name, qrToken: parsed.data.qrToken },
  });

  await prisma.auditLog.create({
    data: {
      branchId: auth.branchId,
      userId: auth.userId,
      action: "table.create",
      entity: "Table",
      entityId: table.id,
      newValue: { name: table.name, qrToken: table.qrToken },
    },
  });

  return Response.json({ table });
}
