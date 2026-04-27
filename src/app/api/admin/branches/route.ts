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
  if (!can(auth.role, "admin.read")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ branches });
}

const CreateSchema = z.object({
  name: z.string().min(2),
  taxRate: z.number().min(0).max(1).default(0),
  serviceChargeRate: z.number().min(0).max(1).default(0),
});

export async function POST(request: Request) {
  const token = await getSessionCookie();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const auth = await requireAuth(token);
  if (!can(auth.role, "admin.write")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const branch = await prisma.branch.create({
    data: {
      name: parsed.data.name,
      taxRate: parsed.data.taxRate,
      serviceChargeRate: parsed.data.serviceChargeRate,
    },
  });

  await prisma.auditLog.create({
    data: {
      branchId: branch.id,
      userId: auth.userId,
      action: "branch.create",
      entity: "Branch",
      entityId: branch.id,
      metadata: { name: branch.name },
    },
  });

  return Response.json({ branch });
}

