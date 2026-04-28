import { prisma } from "@/lib/db";
import { resolvePrice } from "@/lib/enterprise/pricing";
import { requirePosPermission } from "@/lib/pos/auth";
import { posError, posSuccess } from "@/lib/pos/http";
import { calculateOrderTotals } from "@/lib/pos/order-pricing";
import { ItemStatus, OrderStatus } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

const DiscountSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("NONE") }),
  z.object({ type: z.literal("PERCENT"), value: z.number().min(0).max(100) }),
  z.object({ type: z.literal("AMOUNT"), value: z.number().min(0) }),
]);

const BodySchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1),
  unitPrice: z.number().min(0).optional(),
  discount: DiscountSchema.optional(),
  note: z.string().trim().max(500).optional(),
  modifiers: z.array(z.object({ modifierOptionId: z.string().uuid(), qty: z.number().int().min(1) })).optional(),
});

export async function POST(request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const authResult = await requirePosPermission("order.write");
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  const { orderId } = await ctx.params;
  const payload = BodySchema.safeParse(await request.json());
  if (!payload.success) return posError("VALIDATION_ERROR", "Invalid payload", 400, payload.error.flatten());

  const order = await prisma.order.findFirst({
    where: { id: orderId, branchId: auth.branchId },
    select: { id: true, branchId: true, status: true },
  });
  if (!order) return posError("NOT_FOUND", "Order not found", 404);
  if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
    return posError("CONFLICT", "Closed order cannot be modified", 409);
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: payload.data.variantId },
    select: { id: true },
  });
  if (!variant) return posError("NOT_FOUND", "Variant not found", 404);

  const resolvedUnitPrice =
    payload.data.unitPrice ?? (await resolvePrice({ branchId: auth.branchId, variantId: payload.data.variantId }));

  const createdItem = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      variantId: payload.data.variantId,
      quantity: payload.data.qty,
      status: ItemStatus.PENDING,
      note: payload.data.note,
      modifiers: {
        selected: payload.data.modifiers ?? [],
        pricing: {
          unitPrice: resolvedUnitPrice,
          discount: payload.data.discount ?? { type: "NONE" },
        },
      },
    },
  });

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

  return posSuccess({ item: createdItem }, { status: 201 });
}
