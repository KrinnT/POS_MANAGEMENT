import { prisma } from "@/lib/db";
import { getIO } from "@/lib/realtime";
import { ItemStatus, OrderStatus } from "@prisma/client";

export const runtime = "nodejs";

type PatchItemBody = {
  status: ItemStatus;
};

export async function PATCH(request: Request, ctx: RouteContext<"/api/order-items/[itemId]">) {
  const { itemId } = await ctx.params;
  const body = (await request.json()) as PatchItemBody;

  const item = await prisma.orderItem.update({
    where: { id: itemId },
    data: { status: body.status },
    include: { order: true, product: true },
  });

  // Best-effort order status rollup
  const allItems = await prisma.orderItem.findMany({
    where: { orderId: item.orderId },
    select: { status: true },
  });
  const statuses = allItems.map((i) => i.status);
  const nextOrderStatus =
    statuses.every((s) => s === ItemStatus.SERVED)
      ? OrderStatus.SERVED
      : statuses.some((s) => s === ItemStatus.PREPARING || s === ItemStatus.READY)
        ? OrderStatus.PREPARING
        : OrderStatus.PENDING;

  const order = await prisma.order.update({
    where: { id: item.orderId },
    data: { status: nextOrderStatus },
    include: { table: true, items: { include: { product: true } } },
  });

  const io = getIO();
  io?.emit("item:updated", item);
  io?.to(`branch:${order.branchId}`).emit("order:updated", order);
  io?.to(`order:${item.orderId}`).emit("order:updated", order);
  io?.to(`table:${order.tableId}`).emit("order:updated", order);

  return Response.json({ item, order });
}

