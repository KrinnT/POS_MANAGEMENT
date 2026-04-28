import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guard";
import { PayStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requirePermission("report.read");
  if (!guard.ok) return guard.response;
  const auth = guard.auth;
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const orders = await prisma.order.findMany({
    where: { branchId: auth.branchId },
    select: { id: true, totalAmount: true, paymentStatus: true },
  });

  const revenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const paidOrders = orders.filter((o) => o.paymentStatus === PayStatus.PAID).length;

  const items = await prisma.orderItem.findMany({
    where: { order: { branchId: auth.branchId } },
    include: { variant: { include: { product: true, priceEntries: true } } },
  });

  const byProduct = new Map<string, { name: string; qty: number; amount: number }>();
  for (const it of items) {
    const key = it.variant.productId;
    const cur = byProduct.get(key) ?? { name: it.variant.product.name, qty: 0, amount: 0 };
    cur.qty += it.quantity;
    cur.amount += it.quantity * (it.variant.priceEntries[0]?.price ?? 0); 
    byProduct.set(key, cur);
  }
  const topItems = [...byProduct.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);

  return Response.json({
    summary: {
      revenue,
      orders: orders.length,
      paidOrders,
      topItems,
    },
  });
}
