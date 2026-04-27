"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSocket } from "@/lib/socketClient";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  station: "HOT" | "COLD" | "BAR";
};

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
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  paymentMethod: string | null;
  totalAmount: number;
  tableId: string;
  items: OrderItem[];
};

export default function SmartOrderingClient({ qrToken }: { qrToken: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [tableId, setTableId] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [order, setOrder] = useState<Order | null>(null);

  const cartLines = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ product: byId.get(productId)!, productId, quantity }));
  }, [cart, products]);

  const cartTotal = useMemo(
    () => cartLines.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
    [cartLines],
  );

  useEffect(() => {
    let alive = true;
    async function boot() {
      try {
        setLoading(true);
        setError(null);

        const tablesRes = await fetch("/api/tables");
        const { tables } = (await tablesRes.json()) as { tables: Array<{ id: string; qrToken: string; name: string; branchId: string }> };
        const table = tables.find((t) => t.qrToken === qrToken);
        if (!table) {
          setError("QR không hợp lệ hoặc bàn chưa được cấu hình.");
          return;
        }
        setTableId(table.id);

        const menuRes = await fetch(`/api/menu?branchId=${encodeURIComponent(table.branchId)}`);
        const { products } = (await menuRes.json()) as { products: Product[] };
        if (!alive) return;
        setProducts(products);

        const socket = await getSocket();
        socket.emit("join:table", table.id);
        socket.on("order:updated", (o: Order) => {
          if (o.tableId === table.id) setOrder(o);
        });
        socket.on("order:created", (o: Order) => {
          if (o.tableId === table.id) setOrder(o);
        });
      } catch {
        setError("Không tải được dữ liệu. Vui lòng thử lại.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void boot();
    return () => {
      alive = false;
    };
  }, [qrToken]);

  async function placeOrder() {
    if (!tableId) return;
    setError(null);
    try {
      const payload = {
        tableId,
        items: cartLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("create-failed");
      const { order } = (await res.json()) as { order: Order };
      setOrder(order);
      setCart({});
    } catch {
      setError("Tạo đơn thất bại. Vui lòng thử lại.");
    }
  }

  async function payMock(method: string) {
    if (!order) return;
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "PAID", paymentMethod: method }),
      });
      if (!res.ok) throw new Error("pay-failed");
      const data = (await res.json()) as { order: Order };
      setOrder(data.order);
    } catch {
      setError("Thanh toán thất bại (mock).");
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-white text-slate-900 p-6">Loading…</div>;
  }
  if (error) {
    return (
      <div className="min-h-screen bg-white text-slate-900 p-6">
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Smart Ordering</h1>
          <p className="text-slate-700 mt-2">{error}</p>
          <Link className="inline-block mt-4 text-slate-900 font-semibold hover:underline" href="/">
            Về Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white text-slate-900 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Table-side Ordering</h1>
            <p className="text-slate-600 mt-1">Chọn món, gửi order xuống bếp realtime.</p>
          </div>
          <Link className="text-sm font-semibold text-slate-900 hover:underline" href="/">
            Back
          </Link>
        </div>

        {order && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Đơn hiện tại</div>
                <div className="font-semibold text-slate-900">{order.id.slice(0, 8).toUpperCase()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600">Trạng thái</div>
                <div className="font-semibold text-slate-900">{order.status}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {order.items.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <div>
                    <div className="font-semibold text-slate-900">{i.product.name}</div>
                    <div className="text-xs text-slate-600">
                      x{i.quantity} · {i.status}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {(i.product.price * i.quantity).toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-slate-600 text-sm">Tổng</div>
              <div className="text-lg font-semibold text-slate-900">{order.totalAmount.toFixed(0)}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => payMock("MOMO")}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-white"
                disabled={order.paymentStatus === "PAID"}
              >
                Pay (Momo) — mock
              </button>
              <button
                onClick={() => payMock("VNPAY")}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-900"
                disabled={order.paymentStatus === "PAID"}
              >
                Pay (VNPay) — mock
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Menu</h2>
            <div className="text-sm text-slate-600">
              Cart: <span className="font-semibold text-slate-900">{cartTotal.toFixed(0)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-5">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{category}</div>
                <div className="space-y-2">
                  {items.map((p) => {
                    const qty = cart[p.id] ?? 0;
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                          <div className="text-xs text-slate-600">
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

          <div className="mt-5 flex items-center justify-between">
            <div className="text-sm text-slate-600">Gửi order xuống bếp ngay khi đặt món.</div>
            <button
              onClick={placeOrder}
              disabled={!tableId || cartLines.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-semibold text-white"
            >
              Place order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

