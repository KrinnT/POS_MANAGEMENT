"use client";

import { useEffect, useMemo, useState } from "react";
import { joinBranch } from "@/lib/socketClient";
import { AppShell } from "@/components/AppShell";

type Product = { id: string; name: string; station: "HOT" | "COLD" | "BAR" };
type OrderItem = {
  id: string;
  quantity: number;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED";
  note: string | null;
  product: Product;
};
type Order = {
  id: string;
  status: "PENDING" | "PREPARING" | "SERVED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  table: { name: string; id: string };
  items: OrderItem[];
};

export default function KdsPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const meRes = await fetch("/api/auth/me");
      const me = (await meRes.json()) as { user: { branchId: string | null } | null };
      const branchId = me.user?.branchId ?? null;

      const res = await fetch("/api/orders");
      const { orders } = (await res.json()) as { orders: Order[] };
      if (!alive) return;
      setOrders(orders);

      const socket = branchId ? await joinBranch(branchId) : await joinBranch("unknown");
      socket.on("order:created", (o: Order) => setOrders((prev) => [o, ...prev].slice(0, 50)));
      socket.on("order:updated", (o: Order) =>
        setOrders((prev) => {
          const next = prev.map((x) => (x.id === o.id ? o : x));
          return next;
        }),
      );
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const tickets = useMemo(() => {
    const all = orders.flatMap((o) =>
      o.items
        .filter((i) => i.status !== "SERVED")
        .map((i) => ({
          orderId: o.id,
          tableName: o.table.name,
          createdAt: o.createdAt,
          item: i,
        })),
    );
    const byStation = all.reduce<Record<string, typeof all>>((acc, t) => {
      const key = t.item.product.station;
      (acc[key] ??= []).push(t);
      return acc;
    }, {});
    return byStation;
  }, [orders]);

  async function setItemStatus(itemId: string, status: OrderItem["status"]) {
    await fetch(`/api/order-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  const stations: Array<OrderItem["product"]["station"]> = ["HOT", "COLD", "BAR"];

  return (
    <AppShell title="Kitchen Display (KDS)" subtitle="Ticket realtime theo trạm, thao tác nhanh cho bếp/bar.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {stations.map((s) => (
          <div key={s} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{s}</h2>
              <span className="text-xs text-slate-500">{(tickets[s]?.length ?? 0).toString()} tickets</span>
            </div>
            <div className="mt-4 space-y-3">
              {(tickets[s] ?? []).map((t) => (
                <div key={t.item.id} className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {t.item.product.name} <span className="text-slate-500">x{t.item.quantity}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {t.tableName} · <span className="font-mono">{t.orderId.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{t.item.status}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white"
                        onClick={() => setItemStatus(t.item.id, "PREPARING")}
                      >
                        Preparing
                      </button>
                      <button
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-900"
                        onClick={() => setItemStatus(t.item.id, "READY")}
                      >
                        Ready
                      </button>
                      <button
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                        onClick={() => setItemStatus(t.item.id, "SERVED")}
                      >
                        Served
                      </button>
                    </div>
                  </div>
                  {t.item.note ? <div className="text-xs text-slate-700 mt-2">Note: {t.item.note}</div> : null}
                </div>
              ))}
              {(tickets[s]?.length ?? 0) === 0 ? <div className="text-sm text-slate-600">Không có ticket.</div> : null}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

