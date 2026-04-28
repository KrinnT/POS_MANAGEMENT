export type PromotionRule = {
  conditions: {
    minCartValue?: number;
    categories?: string[];
    customerTier?: string;
    branchIds?: string[];
  };
  action: {
    type: "PERCENT_DISCOUNT" | "FIXED_DISCOUNT";
    value: number;
    targetCategory?: string;
  };
};

type CartItem = {
  price: number;
  quantity: number;
  product: {
    categoryId: string;
  };
};

type PromotionCart = {
  subtotal: number;
  branchId: string;
  items: CartItem[];
};

type PromotionLike = {
  rules: PromotionRule;
};

export function evaluatePromotion(cart: PromotionCart, promotion: PromotionLike): number {
  const rules = promotion.rules as PromotionRule;
  
  // 1. Check conditions
  if (rules.conditions.minCartValue && cart.subtotal < rules.conditions.minCartValue) return 0;
  if (rules.conditions.branchIds && !rules.conditions.branchIds.includes(cart.branchId)) return 0;

  // 2. Apply action
  if (rules.action.type === "PERCENT_DISCOUNT") {
    // If targetCategory is set, only discount items in that category
    if (rules.action.targetCategory) {
      const targetSubtotal = cart.items
        .filter((i) => i.product.categoryId === rules.action.targetCategory)
        .reduce((sum, i) => sum + i.price * i.quantity, 0);
      return Math.round(targetSubtotal * (rules.action.value / 100));
    }
    return Math.round(cart.subtotal * (rules.action.value / 100));
  }

  if (rules.action.type === "FIXED_DISCOUNT") {
    return rules.action.value;
  }

  return 0;
}
