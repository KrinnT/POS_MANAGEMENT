import { prisma } from "@/lib/db";
import { hmacSha256Hex, timingSafeEqual } from "@/lib/payments/signature";
import { PaymentProvider, PaymentStatus, PayStatus } from "@prisma/client";

export const runtime = "nodejs";

function getSecret() {
  const s = process.env["VNPAY_WEBHOOK_SECRET"];
  if (!s) throw new Error("VNPAY_WEBHOOK_SECRET is not set");
  return s;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-vnpay-signature") ?? "";
  const expected = hmacSha256Hex(getSecret(), rawBody);
  const signatureOk = signature.length > 0 && timingSafeEqual(signature, expected);

  const event = await prisma.paymentEvent.create({
    data: {
      provider: PaymentProvider.VNPAY,
      signatureOk,
      rawBody,
      headers: Object.fromEntries(request.headers.entries()),
    },
  });

  if (!signatureOk) return Response.json({ ok: false }, { status: 400 });

  try {
    const json = JSON.parse(rawBody) as { paymentId?: string; providerRef?: string; success?: boolean };
    if (typeof json.paymentId !== "string") return Response.json({ ok: true });

    const payment = await prisma.payment.update({
      where: { id: json.paymentId },
      data: { status: json.success ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED, providerRef: json.providerRef },
      include: { order: true },
    });

    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: { paymentId: payment.id },
    });

    if (payment.status === PaymentStatus.SUCCEEDED) {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: PayStatus.PAID, paymentMethod: PaymentProvider.VNPAY },
      });
    }
  } catch {
    // ignore
  }

  return Response.json({ ok: true });
}

