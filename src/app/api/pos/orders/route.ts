import { prisma } from "@/lib/db";
import { requirePosPermission } from "@/lib/pos/auth";
import { posError, posSuccess } from "@/lib/pos/http";
import { OrderStatus, PayStatus } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

const QuerySchema = z.object({
  tableId: z.string().uuid().optional(),
});

const CreateOrderSchema = z.object({
  tableId: z.string().uuid(),
  channel: z.enum(["DINE_IN", "TAKE_AWAY", "DELIVERY"]),
  customerId: z.string().uuid().nullable().optional(),
  guestCount: z.number().int().min(1).max(200).default(1),
  priceBookId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export async function GET(request: Request) {
  const authResult = await requirePosPermission("order.read");
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    tableId: url.searchParams.get("tableId") ?? undefined,
  });
  const tableId = parsed.success ? parsed.data.tableId : undefined;

  const orders = await prisma.order.findMany({
    where: {
      branchId: auth.branchId,
      status: { in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.SERVED] },
      ...(tableId ? { tableId } : {}),
    },
    include: {
      table: true,
      items: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return posSuccess({ orders });
}

export async function POST(request: Request) {
  const authResult = await requirePosPermission("order.write");
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  const payload = CreateOrderSchema.safeParse(await request.json());
  if (!payload.success) return posError("VALIDATION_ERROR", "Invalid payload", 400, payload.error.flatten());

  const table = await prisma.table.findFirst({
    where: { id: payload.data.tableId, branchId: auth.branchId },
    select: { id: true, name: true, branchId: true, status: true },
  });
  if (!table) return posError("NOT_FOUND", "Table not found", 404);

  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        branchId: auth.branchId,
        tableId: table.id,
        userId: auth.userId,
        status: OrderStatus.PENDING,
        totalAmount: 0,
        paymentStatus: PayStatus.UNPAID,
        pricing: {
          channel: payload.data.channel,
          customerId: payload.data.customerId ?? null,
          guestCount: payload.data.guestCount,
          priceBookId: payload.data.priceBookId ?? null,
          note: payload.data.note ?? null,
          subtotal: 0,
          totalTax: 0,
          totalAmount: 0,
        },
      },
      include: { table: true, items: true },
    });

    if (table.status !== "OCCUPIED") {
      await tx.table.update({
        where: { id: table.id },
        data: { status: "OCCUPIED" },
      });
    }

    return order;
  });

  return posSuccess({ order: created }, { status: 201 });
}
