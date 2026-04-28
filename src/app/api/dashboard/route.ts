import { prisma } from "@/lib/db";
import { OrderStatus, PayStatus, TableStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [ordersToday, paidOrders, completedOrders, activeTables] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: startOfDay } },
        select: { id: true, createdAt: true, status: true, totalAmount: true, paymentStatus: true, updatedAt: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: startOfDay }, paymentStatus: PayStatus.PAID },
        select: { totalAmount: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: startOfDay }, status: OrderStatus.COMPLETED },
        select: { createdAt: true, updatedAt: true },
      }),
      prisma.table.count({
        where: { status: TableStatus.OCCUPIED },
      }),
    ]);

    const revenueToday = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    let avgTicketTimeMs = 0;
    if (completedOrders.length > 0) {
      const totalTime = completedOrders.reduce((sum, order) => {
        return sum + (order.updatedAt.getTime() - order.createdAt.getTime());
      }, 0);
      avgTicketTimeMs = totalTime / completedOrders.length;
    }

    const avgTicketTimeMinutes = avgTicketTimeMs > 0 ? Math.round(avgTicketTimeMs / 60000) : 0;

    return Response.json({
      revenueToday,
      ordersCount: ordersToday.length,
      activeTables,
      avgTicketTime: avgTicketTimeMinutes,
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return Response.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
