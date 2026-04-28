import { prisma } from "@/lib/db";

export type PriceResolutionContext = {
  branchId: string;
  variantId: string;
};

/**
 * Resolves the price for a product variant at a specific branch.
 * Strategy: Find the most specific PriceBook for the branch, then look for the variant entry.
 */
export async function resolvePrice(ctx: PriceResolutionContext): Promise<number> {
  const priceBookEntry = await prisma.priceBookEntry.findFirst({
    where: {
      variantId: ctx.variantId,
      priceBook: {
        branchId: ctx.branchId,
        isActive: true,
      },
    },
    select: { price: true },
  });

  if (priceBookEntry) return priceBookEntry.price;

  // Fallback to a global/HQ PriceBook (one with no branchId)
  const fallbackEntry = await prisma.priceBookEntry.findFirst({
    where: {
      variantId: ctx.variantId,
      priceBook: {
        branchId: null,
        isActive: true,
      },
    },
    select: { price: true },
  });

  return fallbackEntry?.price ?? 0;
}

/**
 * Calculates tax for an item based on region and tax category.
 */
export async function calculateTax(branchId: string, taxCategoryId: string, amount: number): Promise<number> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { regionId: true },
  });

  if (!branch) return 0;

  const taxRule = await prisma.taxRule.findUnique({
    where: {
      regionId_taxCategoryId: {
        regionId: branch.regionId,
        taxCategoryId: taxCategoryId,
      },
    },
    select: { rate: true },
  });

  return Math.round(amount * (taxRule?.rate ?? 0));
}
