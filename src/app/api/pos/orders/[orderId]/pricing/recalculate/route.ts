import { prisma } from "@/lib/db";
import { requirePosPermission } from "@/lib/pos/auth";
import { posError, posSuccess } from "@/lib/pos/http";
import { calculateOrderTotals } from "@/lib/pos/order-pricing";

export const runtime = "nodejs";

export async function POST(_request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const authResult = await requirePosPermission("order.write");
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  const { orderId } = await ctx.params;
  const order = await prisma.order.findFirst({
    where: { id: orderId, branchId: auth.branchId },
    select: { id: true },
  });
  if (!order) return posError("NOT_FOUND", "Order not found", 404);

  const { computed } = await calculateOrderTotals(order.id);
  await prisma.order.update({
    where: { id: order.id },
    data: {
      totalAmount: computed.grandTotal,
      pricing: {
        subtotal: computed.subtotal,
        lineDiscountTotal: computed.lineDiscountTotal,
        orderDiscountAmount: computed.orderDiscountAmount,
        totalDiscount: computed.totalDiscount,
        taxableAmount: computed.taxableAmount,
        taxTotal: computed.taxTotal,
        grandTotal: computed.grandTotal,
      },
    },
  });

  return posSuccess({ totals: computed });
}
