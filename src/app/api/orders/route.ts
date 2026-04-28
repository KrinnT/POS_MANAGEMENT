import { prisma } from "@/lib/db";
import { getIO } from "@/lib/realtime";
import { OrderStatus, PayStatus, ItemStatus } from "@prisma/client";
import { resolvePrice, calculateTax } from "@/lib/enterprise/pricing";
import { deductInventory } from "@/lib/enterprise/inventory";
import { logAudit } from "@/lib/enterprise/audit";

export const runtime = "nodejs";

type CreateOrderBody = {
  tableId: string;
  items: Array<{ variantId?: string; productId?: string; quantity: number; note?: string }>;
};

export async function GET(request: Request) {
  // Data Isolation: In a real app, we'd get branchId from the session cookie
  // For this demo, we'll allow fetching all if no branchId is provided, 
  // but implement the logic structure.
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");
  const tableId = searchParams.get("tableId");

  const orders = await prisma.order.findMany({
    where: {
      status: { in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.SERVED] },
      ...(branchId ? { branchId } : {}),
      ...(tableId ? { tableId } : {}),
    },
    include: {
      table: true,
      items: { 
        include: { 
          variant: { include: { product: true } } 
        } 
      },
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

  const branchId = table.branchId;
  let subtotal = 0;
  let totalTax = 0;
  
  // Resolve items, prices, and taxes
  const orderItemsData = [];
  for (const item of body.items) {
    if (!item.quantity || item.quantity <= 0) continue;

    let resolvedVariantId = item.variantId;
    if (!resolvedVariantId && item.productId) {
      const firstVariant = await prisma.productVariant.findFirst({
        where: { productId: item.productId },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      resolvedVariantId = firstVariant?.id;
    }
    if (!resolvedVariantId) continue;

    const variant = await prisma.productVariant.findUnique({
      where: { id: resolvedVariantId },
      include: { product: true },
    });
    if (!variant) continue;

    const unitPrice = await resolvePrice({ branchId, variantId: variant.id });
    const itemSubtotal = unitPrice * item.quantity;
    const itemTax = await calculateTax(branchId, variant.product.taxCategoryId, itemSubtotal);

    subtotal += itemSubtotal;
    totalTax += itemTax;

    orderItemsData.push({
      variantId: variant.id,
      quantity: item.quantity,
      status: ItemStatus.PENDING,
      note: item.note,
    });
  }

  if (orderItemsData.length === 0) {
    return Response.json({ error: "No valid order items" }, { status: 400 });
  }

  const totalAmount = subtotal + totalTax;

  // Create Order
  const order = await prisma.order.create({
    data: {
      branchId,
      tableId: body.tableId,
      status: OrderStatus.PENDING,
      totalAmount,
      paymentStatus: PayStatus.UNPAID,
      pricing: { subtotal, totalTax, totalAmount },
      items: {
        create: orderItemsData,
      },
    },
    include: {
      table: true,
      items: { include: { variant: { include: { product: true } } } },
    },
  });

  // Update table status
  await prisma.table.update({
    where: { id: body.tableId },
    data: { status: "OCCUPIED" },
  });

  // Enterprise Feature: Recursive Inventory Deduction
  for (const item of orderItemsData) {
    await deductInventory(branchId, item.variantId, item.quantity, order.id);
  }

  // Enterprise Feature: Immutable Audit Log
  await logAudit("CREATE_ORDER", "Order", order.id, { branchId }, null, order);

  // Realtime notification
  const io = getIO();
  io?.emit("order:created", order);
  io?.to(`branch:${branchId}`).emit("order:created", order);
  io?.to(`table:${body.tableId}`).emit("order:created", order);
  io?.to(`order:${order.id}`).emit("order:created", order);

  return Response.json({ order });
}
