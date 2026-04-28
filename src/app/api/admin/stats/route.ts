import { prisma } from "@/lib/db";
import { PayStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requirePermission("report.read");
  if (!guard.ok) return guard.response;
  const auth = guard.auth;
  if (!auth.branchId) return Response.json({ error: "Branch not selected" }, { status: 400 });

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysStart = new Date(todayStart);
  sevenDaysStart.setDate(sevenDaysStart.getDate() - 6);

  const [ordersToday, paidOrders7Days, totalTables, occupiedTables] = await Promise.all([
    prisma.order.findMany({
      where: {
        branchId: auth.branchId,
        createdAt: { gte: todayStart },
        paymentStatus: PayStatus.PAID,
      },
      select: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: {
        branchId: auth.branchId,
        createdAt: { gte: sevenDaysStart },
        paymentStatus: PayStatus.PAID,
      },
      select: { createdAt: true, totalAmount: true },
    }),
    prisma.table.count({ where: { branchId: auth.branchId } }),
    prisma.table.count({ where: { branchId: auth.branchId, status: "OCCUPIED" } }),
  ]);

  const totalRevenue = ordersToday.reduce((sum, o) => sum + o.totalAmount, 0);
  const orderCount = ordersToday.length;
  const occupancyRate = totalTables > 0 ? occupiedTables / totalTables : 0;

  const dayRevenueMap = new Map<string, number>();
  for (const order of paidOrders7Days) {
    const key = order.createdAt.toISOString().slice(0, 10);
    dayRevenueMap.set(key, (dayRevenueMap.get(key) ?? 0) + order.totalAmount);
  }

  const revenueByDay = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    revenueByDay.push({
      day: day.toLocaleDateString("vi-VN", { weekday: "short" }),
      revenue: Math.round(dayRevenueMap.get(key) ?? 0),
    });
  }

  return Response.json({
    stats: {
      totalRevenue,
      orderCount,
      occupancyRate,
      revenueByDay,
    },
  });
}
