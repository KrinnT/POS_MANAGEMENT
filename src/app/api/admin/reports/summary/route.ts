import { prisma } from "@/lib/db";
import { getSessionCookie } from "@/lib/auth/cookies";
import { requireAuth } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { PayStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionCookie();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const auth = await requireAuth(token);
  if (!can(auth.role, "report.read")) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const orders = await prisma.order.findMany({
    where: { branchId: auth.branchId },
    select: { id: true, totalAmount: true, paymentStatus: true },
  });

  const revenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const paidOrders = orders.filter((o) => o.paymentStatus === PayStatus.PAID).length;

  const items = await prisma.orderItem.findMany({
    where: { order: { branchId: auth.branchId } },
    include: { product: true },
  });

  const byProduct = new Map<string, { name: string; qty: number; amount: number }>();
  for (const it of items) {
    const key = it.productId;
    const cur = byProduct.get(key) ?? { name: it.product.name, qty: 0, amount: 0 };
    cur.qty += it.quantity;
    cur.amount += it.quantity * it.product.price;
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

