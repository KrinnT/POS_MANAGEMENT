import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const qrToken = url.searchParams.get("qrToken");
  const tables = await prisma.table.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(qrToken ? { qrToken } : {}),
    },
    orderBy: { name: "asc" },
  });
  return Response.json({ tables });
}
