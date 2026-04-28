import { describe, expect, it } from "vitest";
import { computeDiscount, computeLine, computeOrderPricing } from "@/lib/pos/pricing";

describe("pos pricing", () => {
  it("computes percent discount safely", () => {
    expect(computeDiscount(100000, { type: "PERCENT", value: 10 })).toBe(10000);
    expect(computeDiscount(100000, { type: "PERCENT", value: 200 })).toBe(100000);
    expect(computeDiscount(100000, { type: "PERCENT", value: -5 })).toBe(0);
  });

  it("computes line amount with discount and tax", () => {
    const line = computeLine({
      qty: 2,
      unitPrice: 30000,
      discount: { type: "AMOUNT", value: 5000 },
      taxRate: 0.08,
    });
    expect(line.baseAmount).toBe(60000);
    expect(line.discountAmount).toBe(5000);
    expect(line.netAmount).toBe(55000);
    expect(line.taxAmount).toBe(4400);
    expect(line.totalAmount).toBe(59400);
  });

  it("clamps invalid inputs", () => {
    const line = computeLine({
      qty: -1,
      unitPrice: -100,
      discount: { type: "AMOUNT", value: 99999 },
      taxRate: -1,
    });
    expect(line.baseAmount).toBe(0);
    expect(line.discountAmount).toBe(0);
    expect(line.netAmount).toBe(0);
    expect(line.taxAmount).toBe(0);
    expect(line.totalAmount).toBe(0);
  });

  it("distributes order-level discount into tax base", () => {
    const totals = computeOrderPricing({
      lines: [
        { qty: 1, unitPrice: 50000, discount: { type: "NONE" }, taxRate: 0.1 },
        { qty: 1, unitPrice: 50000, discount: { type: "NONE" }, taxRate: 0.1 },
      ],
      orderDiscount: { type: "AMOUNT", value: 10000 },
    });

    expect(totals.subtotal).toBe(100000);
    expect(totals.orderDiscountAmount).toBe(10000);
    expect(totals.taxableAmount).toBe(90000);
    expect(totals.taxTotal).toBe(9000);
    expect(totals.grandTotal).toBe(99000);
  });
});
