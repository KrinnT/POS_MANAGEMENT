import { prisma } from "@/lib/db";
import { resolvePrice } from "@/lib/enterprise/pricing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");

  // Fetch products with their variants
  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: true,
    },
    orderBy: { name: "asc" },
  });

  // Resolve prices for the branch
  const productsWithPrices = await Promise.all(
    products.map(async (p) => {
      const variantsWithPrices = await Promise.all(
        p.variants.map(async (v) => {
          const price = branchId ? await resolvePrice({ branchId, variantId: v.id }) : 0;
          return { ...v, price };
        })
      );
      return { 
        ...p, 
        category: p.category.name,
        price: variantsWithPrices[0]?.price ?? 0, // Fallback for UI that expects p.price
        variants: variantsWithPrices 
      };
    })
  );

  return Response.json({ products: productsWithPrices });
}
