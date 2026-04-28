import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guard";
import { z } from "zod";
import { KitchenStation } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requirePermission("menu.read");
  if (!guard.ok) return guard.response;

  const products = await prisma.product.findMany({
    include: { category: true, variants: true },
    orderBy: { name: "asc" },
  });
  return Response.json({ products });
}

const CreateSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string(),
  taxCategoryId: z.string(),
  station: z.nativeEnum(KitchenStation),
});

export async function POST(request: Request) {
  const guard = await requirePermission("menu.write");
  if (!guard.ok) return guard.response;
  const auth = guard.auth;

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      categoryId: parsed.data.categoryId,
      taxCategoryId: parsed.data.taxCategoryId,
      kitchenStation: parsed.data.station,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: auth.userId,
      action: "product.create",
      entity: "Product",
      entityId: product.id,
      newValue: { name: product.name },
    },
  });

  return Response.json({ product });
}
