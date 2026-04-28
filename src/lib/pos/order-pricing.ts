import { prisma } from "@/lib/db";
import { calculateTax, resolvePrice } from "@/lib/enterprise/pricing";
import { computeOrderPricing, type DiscountInput } from "@/lib/pos/pricing";

type ItemPricingMeta = {
  unitPrice?: number;
  discount?: DiscountInput;
};

function readItemPricingMeta(modifiers: unknown): ItemPricingMeta {
  if (!modifiers || typeof modifiers !== "object") return {};
  const maybeMeta = (modifiers as { pricing?: unknown }).pricing;
  if (!maybeMeta || typeof maybeMeta !== "object") return {};
  const raw = maybeMeta as { unitPrice?: unknown; discount?: unknown };

  const unitPrice = typeof raw.unitPrice === "number" && Number.isFinite(raw.unitPrice) ? raw.unitPrice : undefined;
  const discountRaw = raw.discount;
  const discount =
    discountRaw && typeof discountRaw === "object" && "type" in discountRaw
      ? (discountRaw as DiscountInput)
      : undefined;

  return { unitPrice, discount };
}

export async function calculateOrderTotals(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: {
            include: { product: true },
          },
        },
      },
    },
  });
  if (!order) throw new Error("Order not found");

  const pricingLines = await Promise.all(
    order.items.map(async (item) => {
      const meta = readItemPricingMeta(item.modifiers);
      const unitPrice =
        meta.unitPrice ??
        (await resolvePrice({
          branchId: order.branchId,
          variantId: item.variantId,
        }));

      const lineBase = unitPrice * item.quantity;
      const tax = await calculateTax(order.branchId, item.variant.product.taxCategoryId, lineBase);
      const taxRate = lineBase > 0 ? tax / lineBase : 0;

      return {
        qty: item.quantity,
        unitPrice,
        discount: meta.discount ?? { type: "NONE" as const },
        taxRate,
      };
    }),
  );

  const orderDiscount = (() => {
    if (!order.pricing || typeof order.pricing !== "object") return { type: "NONE" as const };
    const data = order.pricing as { orderDiscount?: unknown };
    const raw = data.orderDiscount;
    if (!raw || typeof raw !== "object" || !("type" in raw)) return { type: "NONE" as const };
    return raw as DiscountInput;
  })();

  const computed = computeOrderPricing({
    lines: pricingLines,
    orderDiscount,
  });

  return {
    order,
    computed,
  };
}
