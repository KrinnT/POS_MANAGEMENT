import { prisma } from "@/lib/db";
import { getSessionCookie } from "@/lib/auth/cookies";
import { requireAuth } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { z } from "zod";
import { KitchenStation } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionCookie();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const auth = await requireAuth(token);
  if (!can(auth.role, "menu.read")) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const products = await prisma.product.findMany({
    where: { branchId: auth.branchId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return Response.json({ products });
}

const CreateSchema = z.object({
  name: z.string().min(2),
  price: z.number().min(0),
  category: z.string().min(1),
  station: z.nativeEnum(KitchenStation),
  isAvailable: z.boolean().optional(),
});

export async function POST(request: Request) {
  const token = await getSessionCookie();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const auth = await requireAuth(token);
  if (!can(auth.role, "menu.write")) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const product = await prisma.product.create({
    data: { ...parsed.data, branchId: auth.branchId, isAvailable: parsed.data.isAvailable ?? true },
  });

  await prisma.auditLog.create({
    data: {
      branchId: auth.branchId,
      userId: auth.userId,
      action: "product.create",
      entity: "Product",
      entityId: product.id,
      metadata: { name: product.name, price: product.price },
    },
  });

  return Response.json({ product });
}

