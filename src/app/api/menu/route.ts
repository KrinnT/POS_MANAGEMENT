import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const products = await prisma.product.findMany({
    where: { isAvailable: true, ...(branchId ? { branchId } : {}) },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return Response.json({ products });
}

