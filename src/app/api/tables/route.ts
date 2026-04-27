import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const tables = await prisma.table.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: { name: "asc" },
  });
  return Response.json({ tables });
}

