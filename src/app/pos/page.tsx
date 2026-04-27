"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSocket, joinBranch } from "@/lib/socketClient";
import { AppShell } from "@/components/AppShell";

type Table = { id: string; name: string; status: "AVAILABLE" | "OCCUPIED"; qrToken: string };
type Product = { id: string; name: string; category: string; price: number; station: "HOT" | "COLD" | "BAR" };
type Order = {
  id: string;
  tableId: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  items: Array<{ id: string; quantity: number; status: string; product: Product }>;
  table: Table;
};

export default function PosPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);

  const activeTable = useMemo(() => tables.find((t) => t.id === activeTableId) ?? null, [tables, activeTableId]);
  const cartLines = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ product: byId.get(productId)!, productId, quantity }));
  }, [cart, products]);
  const total = useMemo(() => cartLines.reduce((s, l) => s + l.product.price * l.quantity, 0), [cartLines]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const meRes = await fetch("/api/auth/me");
      const me = (await meRes.json()) as { user: { branchId: string | null } | null };
      const branchId = me.user?.branchId ?? null;

      const [tRes, mRes, oRes] = await Promise.all([fetch("/api/tables"), fetch("/api/menu"), fetch("/api/orders")]);
      const { tables } = (await tRes.json()) as { tables: Table[] };
      const { products } = (await mRes.json()) as { products: Product[] };
      const { orders } = (await oRes.json()) as { orders: Order[] };
      if (!alive) return;
      setTables(tables);
      setProducts(products);
      setOrders(orders);

      const socket = branchId ? await joinBranch(branchId) : await getSocket();
      socket.on("order:created", (order: Order) => {
        setOrders((prev) => [order, ...prev].slice(0, 50));
      });
      socket.on("order:updated", (order: Order) => {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      });
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  async function createOrder() {
    if (!activeTableId || cartLines.length === 0) return;
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId: activeTableId,
        items: cartLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      }),
    });
    setCart({});
  }

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <AppShell
      title="POS Terminal"
      subtitle="Tạo order nhanh, ít thao tác, đồng bộ realtime xuống bếp."
      right={
        activeTable ? (
          <Link
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            href={`/order/${activeTable.qrToken}`}
          >
            Customer view
          </Link>
        ) : (
          <div className="text-sm text-slate-600">Chọn bàn để mở customer view</div>
        )
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Tables</div>
            <div className="mt-3 space-y-2">
              {tables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTableId(t.id)}
                  className={[
                    "w-full text-left rounded-xl border px-3 py-3 transition",
                    t.id === activeTableId ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{t.name}</span>
                    <span
                      className={[
                        "text-[11px] px-2 py-1 rounded-full border",
                        t.status === "OCCUPIED"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700",
                      ].join(" ")}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    QR: <span className="font-mono">{t.qrToken}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="lg:col-span-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Menu</div>
              <div className="text-sm text-slate-600">{activeTable ? `Selected: ${activeTable.name}` : "Chưa chọn bàn"}</div>
            </div>

            <div className="mt-4 space-y-5">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{category}</div>
                  <div className="space-y-2">
                    {items.map((p) => {
                      const qty = cart[p.id] ?? 0;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                            <div className="text-xs text-slate-500">
                              {p.station} · {p.price.toFixed(0)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900"
                              onClick={() => setCart((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) - 1) }))}
                            >
                              -
                            </button>
                            <div className="w-8 text-center text-sm font-semibold text-slate-900">{qty}</div>
                            <button
                              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                              onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Cart</div>
            <div className="mt-3 space-y-2">
              {cartLines.length === 0 ? (
                <div className="text-sm text-slate-600">Chưa có món.</div>
              ) : (
                cartLines.map((l) => (
                  <div key={l.productId} className="flex items-center justify-between">
                    <div className="text-sm text-slate-900">
                      {l.product.name} <span className="text-slate-500">x{l.quantity}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{(l.product.price * l.quantity).toFixed(0)}</div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="text-sm text-slate-600">Total</span>
              <span className="text-lg font-semibold text-slate-900">{total.toFixed(0)}</span>
            </div>
            <button
              onClick={createOrder}
              disabled={!activeTableId || cartLines.length === 0}
              className="mt-4 w-full px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-semibold text-white"
            >
              Send to kitchen
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Active Orders</div>
            <div className="mt-3 space-y-2">
              {orders.slice(0, 10).map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900">{o.table.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{o.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {o.status} · {o.items.length} items · {o.totalAmount.toFixed(0)}
                  </div>
                </div>
              ))}
              {orders.length === 0 ? <div className="text-sm text-slate-600">Chưa có order.</div> : null}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

