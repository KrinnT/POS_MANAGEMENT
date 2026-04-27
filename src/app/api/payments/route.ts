import { prisma } from "@/lib/db";
import { z } from "zod";
import { PaymentProvider, PaymentStatus, PayStatus } from "@prisma/client";
import { getIO } from "@/lib/realtime";

export const runtime = "nodejs";

const BodySchema = z.object({
  orderId: z.string().uuid(),
  provider: z.nativeEnum(PaymentProvider),
  idempotencyKey: z.string().min(8),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const { orderId, provider, idempotencyKey } = parsed.data;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
  if (existing) return Response.json({ payment: existing });

  // Production: call Momo/VNPay create-payment APIs here.
  // For now, create a payment intent and return a payUrl placeholder.
  const payment = await prisma.payment.create({
    data: {
      orderId,
      provider,
      status: PaymentStatus.PENDING,
      amount: order.totalAmount,
      idempotencyKey,
    },
  });

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { payUrl: `/pay/${provider.toLowerCase()}?paymentId=${payment.id}` },
  });

  return Response.json({ payment: updated });
}

export async function PATCH(request: Request) {
  // Internal helper to mark payment success/fail (used by webhooks).
  const parsed = z
    .object({
      paymentId: z.string().uuid(),
      status: z.nativeEnum(PaymentStatus),
      providerRef: z.string().optional(),
    })
    .safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const payment = await prisma.payment.update({
    where: { id: parsed.data.paymentId },
    data: { status: parsed.data.status, providerRef: parsed.data.providerRef },
    include: { order: true },
  });

  if (payment.status === PaymentStatus.SUCCEEDED) {
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: PayStatus.PAID, paymentMethod: payment.provider },
    });
  }

  const io = getIO();
  io?.to(`branch:${payment.order.branchId}`).emit("payment:updated", payment);
  io?.to(`order:${payment.orderId}`).emit("payment:updated", payment);

  return Response.json({ payment });
}

