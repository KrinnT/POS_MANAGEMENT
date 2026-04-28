export type PricingConfig = {
  taxRate: number; // 0.1 = 10%
  serviceChargeRate: number; // 0.05 = 5%
  discountRate: number; // 0.05 = 5%
};

export type Line = {
  product: { id: string; name: string; price: number };
  quantity: number;
};

export function computePricing(lines: Line[], cfg: PricingConfig) {
  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const discount = Math.round(subtotal * (cfg.discountRate ?? 0));
  const afterDiscount = subtotal - discount;
  const serviceCharge = Math.round(afterDiscount * (cfg.serviceChargeRate ?? 0));
  const taxable = afterDiscount + serviceCharge;
  const tax = Math.round(taxable * (cfg.taxRate ?? 0));
  const total = taxable + tax;

  return {
    subtotal,
    discount,
    serviceCharge,
    tax,
    total,
    snapshot: {
      cfg,
      subtotal,
      discount,
      serviceCharge,
      tax,
      total,
    },
  };
}
