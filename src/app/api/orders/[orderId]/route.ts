import { prisma } from "@/lib/db";
import { getIO } from "@/lib/realtime";
import { OrderStatus, PayStatus, PaymentMethod } from "@prisma/client";

export const runtime = "nodejs";

type PatchOrderBody =
  | { status: OrderStatus }
  | { paymentStatus: PayStatus; paymentMethod?: PaymentMethod | null };

export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[orderId]">) {
  const { orderId } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { table: true, items: { include: { variant: { include: { product: true } } } } },
  });

  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ order });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/orders/[orderId]">) {
  const { orderId } = await ctx.params;
  const body = (await request.json()) as PatchOrderBody;

  const order = await prisma.order.update({
    where: { id: orderId },
    data: body as never,
    include: { table: true, items: { include: { variant: { include: { product: true } } } } },
  });

  // If paid+completed, free table.
  if (order.status === OrderStatus.COMPLETED && order.paymentStatus === PayStatus.PAID) {
    await prisma.table.update({
      where: { id: order.tableId },
      data: { status: "AVAILABLE" },
    });
  }

  const io = getIO();
  io?.emit("order:updated", order);
  io?.to(`branch:${order.branchId}`).emit("order:updated", order);
  io?.to(`table:${order.tableId}`).emit("order:updated", order);
  io?.to(`order:${order.id}`).emit("order:updated", order);

  return Response.json({ order });
}
