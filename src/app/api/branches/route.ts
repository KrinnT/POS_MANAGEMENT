import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, timezone: true, currency: true },
  });
  return Response.json({ branches });
}

