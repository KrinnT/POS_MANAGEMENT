import { prisma } from "@/lib/db";
import { getSessionCookie } from "@/lib/auth/cookies";
import { requireAuth } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionCookie();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const auth = await requireAuth(token);
  if (!can(auth.role, "table.read")) return Response.json({ error: "Forbidden" }, { status: 403 });
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
  const token = await getSessionCookie();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const auth = await requireAuth(token);
  if (!can(auth.role, "table.write")) return Response.json({ error: "Forbidden" }, { status: 403 });
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
      metadata: { name: table.name, qrToken: table.qrToken },
    },
  });

  return Response.json({ table });
}

