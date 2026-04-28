import { prisma } from "@/lib/db";
import { requirePosPermission } from "@/lib/pos/auth";
import { posError, posSuccess } from "@/lib/pos/http";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

const QuerySchema = z.object({
  tableId: z.string().uuid(),
});

export async function GET(request: Request) {
  const authResult = await requirePosPermission("order.read");
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    tableId: url.searchParams.get("tableId"),
  });
  if (!parsed.success) return posError("VALIDATION_ERROR", "tableId is required", 400, parsed.error.flatten());

  const order = await prisma.order.findFirst({
    where: {
      branchId: auth.branchId,
      tableId: parsed.data.tableId,
      status: { in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.SERVED] },
    },
    include: {
      table: true,
      items: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return posSuccess({ order });
}
