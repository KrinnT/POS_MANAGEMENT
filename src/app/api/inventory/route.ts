import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.inventory.findMany({
    orderBy: { ingredient: "asc" },
  });
  return Response.json({ items });
}

