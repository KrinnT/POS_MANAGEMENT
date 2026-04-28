import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const balances = await prisma.inventoryBalance.findMany({
    include: { material: true },
    orderBy: { material: { name: "asc" } },
  });
  const items = balances.map((balance) => ({
    id: `${balance.branchId}:${balance.materialId}`,
    ingredient: balance.material.name,
    stockQuantity: balance.quantity,
    unit: balance.material.unit,
    minThreshold: 100,
  }));
  return Response.json({ items });
}
