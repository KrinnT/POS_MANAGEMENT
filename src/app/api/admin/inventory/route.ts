import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guard";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requirePermission("inventory.read");
  if (!guard.ok) return guard.response;
  const auth = guard.auth;
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const balances = await prisma.inventoryBalance.findMany({
    where: { branchId: auth.branchId },
    include: { material: true },
    orderBy: { material: { name: "asc" } },
  });

  const items = balances.map(b => ({
    id: b.materialId,
    ingredient: b.material.name,
    stockQuantity: b.quantity,
    unit: b.material.unit,
    minThreshold: 0, // Simplified for now
  }));

  return Response.json({ items });
}

const CreateSchema = z.object({
  ingredient: z.string().min(1),
  stockQuantity: z.number().min(0),
  unit: z.string().min(1),
});

export async function POST(request: Request) {
  const guard = await requirePermission("inventory.write");
  if (!guard.ok) return guard.response;
  const auth = guard.auth;
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  // 1. Create or get Material
  const material = await prisma.material.upsert({
    where: { name: parsed.data.ingredient },
    update: { unit: parsed.data.unit },
    create: { name: parsed.data.ingredient, unit: parsed.data.unit },
  });

  // 2. Create or update Balance
  const balance = await prisma.inventoryBalance.upsert({
    where: { branchId_materialId: { branchId: auth.branchId, materialId: material.id } },
    update: { quantity: parsed.data.stockQuantity },
    create: { branchId: auth.branchId, materialId: material.id, quantity: parsed.data.stockQuantity },
  });

  await prisma.auditLog.create({
    data: {
      branchId: auth.branchId,
      userId: auth.userId,
      action: "inventory.update",
      entity: "InventoryBalance",
      entityId: material.id,
      newValue: { quantity: balance.quantity },
    },
  });

  return Response.json({ 
    item: {
      id: material.id,
      ingredient: material.name,
      stockQuantity: balance.quantity,
      unit: material.unit
    }
  });
}
