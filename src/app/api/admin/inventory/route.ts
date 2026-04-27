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
  if (!can(auth.role, "inventory.read")) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const items = await prisma.inventory.findMany({
    where: { branchId: auth.branchId },
    orderBy: { ingredient: "asc" },
  });
  return Response.json({ items });
}

const CreateSchema = z.object({
  ingredient: z.string().min(1),
  stockQuantity: z.number().min(0),
  unit: z.string().min(1),
  minThreshold: z.number().min(0),
});

export async function POST(request: Request) {
  const token = await getSessionCookie();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const auth = await requireAuth(token);
  if (!can(auth.role, "inventory.write")) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const item = await prisma.inventory.create({
    data: { ...parsed.data, branchId: auth.branchId },
  });

  await prisma.auditLog.create({
    data: {
      branchId: auth.branchId,
      userId: auth.userId,
      action: "inventory.create",
      entity: "Inventory",
      entityId: item.id,
      metadata: { ingredient: item.ingredient },
    },
  });

  return Response.json({ item });
}

