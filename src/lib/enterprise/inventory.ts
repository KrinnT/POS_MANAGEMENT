import { prisma } from "@/lib/db";
import { TransactionType } from "@prisma/client";

/**
 * Deducts inventory for a product variant including all recursive BOM items and modifiers.
 */
export async function deductInventory(branchId: string, variantId: string, quantity: number, orderId?: string) {
  // 1. Get recursive BOM items
  const itemsToDeduct = await getFlattenedBOM(variantId, quantity);

  // 2. Perform deductions and create transactions (Event Sourcing)
  for (const item of itemsToDeduct) {
    if (!item.materialId) continue;

    // Use a transaction ledger approach
    await prisma.$transaction([
      // Update balance
      prisma.inventoryBalance.upsert({
        where: { branchId_materialId: { branchId, materialId: item.materialId } },
        update: { quantity: { decrement: item.totalQuantity } },
        create: { branchId, materialId: item.materialId, quantity: -item.totalQuantity },
      }),
      // Append-only transaction log
      prisma.inventoryTransaction.create({
        data: {
          branchId,
          materialId: item.materialId,
          type: TransactionType.SALE,
          quantity: -item.totalQuantity,
          documentId: orderId,
        },
      }),
    ]);
  }
}

/**
 * Recursively flattens the BOM for a product variant.
 */
async function getFlattenedBOM(variantId: string, multiplier: number): Promise<Array<{ materialId: string | null, totalQuantity: number }>> {
  const bomEntries = await prisma.bOM.findMany({
    where: { variantId },
  });

  let flattened: Array<{ materialId: string | null, totalQuantity: number }> = [];

  for (const entry of bomEntries) {
    if (entry.materialId) {
      flattened.push({ materialId: entry.materialId, totalQuantity: entry.quantity * multiplier });
    } else if (entry.childVariantId) {
      // Recursive call for nested products (Combos)
      const subItems = await getFlattenedBOM(entry.childVariantId, entry.quantity * multiplier);
      flattened = [...flattened, ...subItems];
    }
  }

  return flattened;
}
