import { prisma } from "@/lib/db";
import { getIO } from "@/lib/realtime";
import { OrderStatus, PayStatus } from "@prisma/client";
import { computePricing } from "@/lib/pricing";

export const runtime = "nodejs";

type CreateOrderBody = {
  tableId: string;
  items: Array<{ productId: string; quantity: number; note?: string }>;
};

export async function GET() {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.SERVED] },
    },
    include: {
      table: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Response.json({ orders });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateOrderBody;
  if (!body.tableId || !Array.isArray(body.items) || body.items.length === 0) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const table = await prisma.table.findUnique({
    where: { id: body.tableId },
    select: { id: true, branchId: true },
  });
  if (!table) return Response.json({ error: "Table not found" }, { status: 404 });

  const productIds = [...new Set(body.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const priceById = new Map(products.map((p) => [p.id, p.price]));

  const branch = await prisma.branch.findUnique({
    where: { id: table.branchId },
    select: { taxRate: true, serviceChargeRate: true },
  });
  const lines = body.items.map((i) => {
    const product = products.find((p) => p.id === i.productId);
    return { product: { id: i.productId, name: product?.name ?? "Unknown", price: priceById.get(i.productId) ?? 0 }, quantity: i.quantity };
  });
  const pricing = computePricing(lines, {
    taxRate: branch?.taxRate ?? 0,
    serviceChargeRate: branch?.serviceChargeRate ?? 0,
    discountRate: 0,
  });

  const order = await prisma.order.create({
    data: {
      branchId: table.branchId,
      tableId: body.tableId,
      status: OrderStatus.PENDING,
      totalAmount: pricing.total,
      paymentStatus: PayStatus.UNPAID,
      pricing: pricing.snapshot,
      items: {
        create: body.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          status: "PENDING",
          note: i.note,
        })),
      },
    },
    include: {
      table: true,
      items: { include: { product: true } },
    },
  });

  const updatedTable = await prisma.table.update({
    where: { id: body.tableId },
    data: { status: "OCCUPIED" },
  });
  // Keep response/realtime payload consistent with DB update.
  order.table = updatedTable;

  // Recipe-based inventory deduction (MVP: direct subtraction).
  // In production: wrap in SERIALIZABLE txn + stock checks.
  const recipes = await prisma.recipe.findMany({
    where: { productId: { in: productIds } },
  });
  const recipeByProduct = new Map<string, Array<{ inventoryId: string; amount: number }>>();
  for (const r of recipes) {
    recipeByProduct.set(r.productId, [...(recipeByProduct.get(r.productId) ?? []), { inventoryId: r.inventoryId, amount: r.amount }]);
  }
  const inventoryDelta = new Map<string, number>();
  for (const item of body.items) {
    const rs = recipeByProduct.get(item.productId) ?? [];
    for (const r of rs) {
      inventoryDelta.set(r.inventoryId, (inventoryDelta.get(r.inventoryId) ?? 0) + r.amount * item.quantity);
    }
  }
  for (const [inventoryId, delta] of inventoryDelta) {
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { stockQuantity: { decrement: delta } },
    });
  }

  const io = getIO();
  io?.emit("order:created", order);
  io?.to(`branch:${order.branchId}`).emit("order:created", order);
  io?.to(`table:${order.tableId}`).emit("order:created", order);
  io?.to(`order:${order.id}`).emit("order:updated", order);

  return Response.json({ order });
}
