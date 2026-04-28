import { prisma } from "@/lib/db";
import { requirePosPermission } from "@/lib/pos/auth";
import { posSuccess } from "@/lib/pos/http";
import { z } from "zod";

export const runtime = "nodejs";

const QuerySchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED"]).optional(),
  keyword: z.string().trim().optional(),
});

export async function GET(request: Request) {
  const authResult = await requirePosPermission("table.read");
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    keyword: url.searchParams.get("keyword") ?? undefined,
  });

  const query = parsed.success ? parsed.data : {};
  const keyword = query.keyword?.toLowerCase();

  const tables = await prisma.table.findMany({
    where: {
      branchId: auth.branchId,
      ...(query.status ? { status: query.status } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: "insensitive" } },
              { qrToken: { contains: keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  return posSuccess({ tables });
}
