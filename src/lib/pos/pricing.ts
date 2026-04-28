export type DiscountInput =
  | { type: "NONE" }
  | { type: "PERCENT"; value: number }
  | { type: "AMOUNT"; value: number };

export type PricingLineInput = {
  qty: number;
  unitPrice: number;
  discount?: DiscountInput;
  taxRate: number;
};

export type PricingLineResult = {
  qty: number;
  unitPrice: number;
  baseAmount: number;
  discountAmount: number;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export type OrderPricingInput = {
  lines: PricingLineInput[];
  orderDiscount?: DiscountInput;
};

export type OrderPricingResult = {
  lines: PricingLineResult[];
  subtotal: number;
  lineDiscountTotal: number;
  orderDiscountAmount: number;
  totalDiscount: number;
  taxableAmount: number;
  taxTotal: number;
  grandTotal: number;
};

function roundCurrency(value: number) {
  return Math.round(value);
}

export function sanitizeQty(qty: number) {
  if (!Number.isFinite(qty)) return 0;
  if (qty <= 0) return 0;
  return Math.floor(qty);
}

export function sanitizeAmount(amount: number) {
  if (!Number.isFinite(amount)) return 0;
  if (amount <= 0) return 0;
  return roundCurrency(amount);
}

export function computeDiscount(baseAmount: number, discount?: DiscountInput) {
  if (!discount || discount.type === "NONE") return 0;

  if (discount.type === "PERCENT") {
    const pct = Math.max(0, Math.min(discount.value, 100));
    return roundCurrency(baseAmount * (pct / 100));
  }

  return Math.min(baseAmount, sanitizeAmount(discount.value));
}

export function computeLine(input: PricingLineInput): PricingLineResult {
  const qty = sanitizeQty(input.qty);
  const unitPrice = sanitizeAmount(input.unitPrice);
  const safeTaxRate = Number.isFinite(input.taxRate) ? Math.max(0, input.taxRate) : 0;

  const baseAmount = roundCurrency(qty * unitPrice);
  const discountAmount = Math.min(baseAmount, computeDiscount(baseAmount, input.discount));
  const netAmount = Math.max(0, baseAmount - discountAmount);
  const taxAmount = roundCurrency(netAmount * safeTaxRate);
  const totalAmount = netAmount + taxAmount;

  return {
    qty,
    unitPrice,
    baseAmount,
    discountAmount,
    netAmount,
    taxAmount,
    totalAmount,
  };
}

export function computeOrderPricing(input: OrderPricingInput): OrderPricingResult {
  const lines = input.lines.map(computeLine);

  const subtotal = lines.reduce((sum, line) => sum + line.baseAmount, 0);
  const lineDiscountTotal = lines.reduce((sum, line) => sum + line.discountAmount, 0);
  const postLineDiscount = Math.max(0, subtotal - lineDiscountTotal);
  const orderDiscountAmount = Math.min(postLineDiscount, computeDiscount(postLineDiscount, input.orderDiscount));

  const taxBaseRatio = postLineDiscount === 0 ? 0 : (postLineDiscount - orderDiscountAmount) / postLineDiscount;
  const normalizedLines = lines.map((line) => {
    if (taxBaseRatio === 1 || taxBaseRatio === 0) return line;
    const scaledNet = roundCurrency(line.netAmount * taxBaseRatio);
    const scaledTax = line.netAmount === 0 ? 0 : roundCurrency(line.taxAmount * (scaledNet / line.netAmount));
    return {
      ...line,
      netAmount: scaledNet,
      taxAmount: scaledTax,
      totalAmount: scaledNet + scaledTax,
    };
  });

  const taxableAmount = normalizedLines.reduce((sum, line) => sum + line.netAmount, 0);
  const taxTotal = normalizedLines.reduce((sum, line) => sum + line.taxAmount, 0);
  const grandTotal = taxableAmount + taxTotal;

  return {
    lines: normalizedLines,
    subtotal,
    lineDiscountTotal,
    orderDiscountAmount,
    totalDiscount: lineDiscountTotal + orderDiscountAmount,
    taxableAmount,
    taxTotal,
    grandTotal,
  };
}
