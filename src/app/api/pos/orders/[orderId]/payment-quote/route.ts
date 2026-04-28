import { prisma } from "@/lib/db";
import { requirePosPermission } from "@/lib/pos/auth";
import { posError, posSuccess } from "@/lib/pos/http";
import { calculateOrderTotals } from "@/lib/pos/order-pricing";
import { PayStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const authResult = await requirePosPermission("order.read");
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  const { orderId } = await ctx.params;
  const order = await prisma.order.findFirst({
    where: { id: orderId, branchId: auth.branchId },
    include: {
      user: { select: { id: true } },
    },
  });
  if (!order) return posError("NOT_FOUND", "Order not found", 404);

  const { computed } = await calculateOrderTotals(order.id);
  const paidAmount =
    order.paymentStatus === PayStatus.PAID
      ? computed.grandTotal
      : order.paymentStatus === PayStatus.PARTIAL
        ? Math.max(0, Math.round(order.totalAmount * 0.5))
        : 0;
  const remaining = Math.max(0, computed.grandTotal - paidAmount);

  return posSuccess({
    orderId: order.id,
    subtotal: computed.subtotal,
    discount: computed.totalDiscount,
    taxableAmount: computed.taxableAmount,
    taxTotal: computed.taxTotal,
    grandTotal: computed.grandTotal,
    paidAmount,
    remainingAmount: remaining,
    suggestedAllocations: [
      { method: "CASH", amount: remaining },
      { method: "CARD", amount: 0 },
      { method: "MOMO", amount: 0 },
      { method: "VNPAY", amount: 0 },
    ],
  });
}
