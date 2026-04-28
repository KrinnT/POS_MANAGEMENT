"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSocket } from "@/lib/socketClient";

type MenuVariant = {
  id: string;
  name: string | null;
  sku: string;
  price: number;
};

type MenuProduct = {
  id: string;
  name: string;
  category: string;
  station: "HOT" | "COLD" | "BAR";
  variants: MenuVariant[];
};

type TableInfo = {
  id: string;
  name: string;
  qrToken: string;
  branchId: string;
};

type OrderItem = {
  id: string;
  quantity: number;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED";
  note: string | null;
  variant: {
    id: string;
    name: string | null;
    sku: string;
    price?: number;
    product: {
      id: string;
      name: string;
      category: string;
      station: "HOT" | "COLD" | "BAR";
    };
  };
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

function vnd(n: number) {
  return n.toLocaleString("vi-VN") + " đ";
}

export default function SmartOrderingClient({ qrToken }: { qrToken: string }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [order, setOrder] = useState<Order | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const variantMap = useMemo(() => {
    const map = new Map<string, MenuVariant & { product: MenuProduct }>();
    products.forEach((product) => {
      product.variants.forEach((variant) => map.set(variant.id, { ...variant, product }));
    });
    return map;
  }, [products]);

  const categories = useMemo(() => ["all", ...new Set(products.map((p) => p.category))], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => activeCategory === "all" || product.category === activeCategory);
  }, [activeCategory, products]);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity, variant: variantMap.get(variantId) }))
      .filter((line): line is { variantId: string; quantity: number; variant: MenuVariant & { product: MenuProduct } } => Boolean(line.variant));
  }, [cart, variantMap]);

  const cartTotal = useMemo(() => {
    return cartLines.reduce((sum, line) => sum + line.variant.price * line.quantity, 0);
  }, [cartLines]);

  useEffect(() => {
    let alive = true;
    async function boot() {
      try {
        setLoading(true);
        setError(null);

        const tableRes = await fetch(`/api/tables?qrToken=${encodeURIComponent(qrToken)}`);
        const tableData = (await tableRes.json()) as { tables?: TableInfo[] };
        const foundTable = tableData.tables?.[0] ?? null;
        if (!foundTable) {
          setError("QR bàn không hợp lệ hoặc đã bị vô hiệu hóa.");
          return;
        }
        if (!alive) return;
        setTable(foundTable);

        const menuRes = await fetch(`/api/menu?branchId=${encodeURIComponent(foundTable.branchId)}`);
        const menuData = (await menuRes.json()) as { products?: MenuProduct[] };
        if (!alive) return;
        setProducts(menuData.products ?? []);

        const ordersRes = await fetch(
          `/api/orders?branchId=${encodeURIComponent(foundTable.branchId)}&tableId=${encodeURIComponent(foundTable.id)}`,
        );
        const ordersData = (await ordersRes.json()) as { orders?: Order[] };
        if (!alive) return;
        const existingOrder = ordersData.orders?.find((o) => o.paymentStatus !== "PAID") ?? null;
        setOrder(existingOrder);

        const socket = await getSocket();
        socket.emit("join:table", foundTable.id);
        if (existingOrder) socket.emit("join:order", existingOrder.id);

        socket.on("order:created", (next: Order) => {
          if (next.tableId !== foundTable.id) return;
          setOrder(next);
          socket.emit("join:order", next.id);
        });
        socket.on("order:updated", (next: Order) => {
          if (next.tableId !== foundTable.id) return;
          setOrder(next);
          socket.emit("join:order", next.id);
        });
      } catch {
        if (alive) setError("Không tải được dữ liệu QR. Vui lòng thử lại.");
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
    if (!table || cartLines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: table.id,
          items: cartLines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
        }),
      });
      if (!res.ok) throw new Error("create-failed");

      const data = (await res.json()) as { order: Order };
      setOrder(data.order);
      setCart({});
    } catch {
      setError("Đặt món thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function payOrder(provider: "MOMO" | "VNPAY") {
    if (!order) return;
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          provider,
          idempotencyKey: `ORDER_${order.id}_${provider}_${new Date().toISOString().slice(0, 16)}`,
        }),
      });
      if (!res.ok) throw new Error("pay-failed");

      const data = (await res.json()) as { payment?: { payUrl?: string } };
      if (data.payment?.payUrl) {
        window.location.href = data.payment.payUrl;
      }
    } catch {
      setError("Khởi tạo thanh toán thất bại.");
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-white p-6 text-slate-900">Đang tải thực đơn theo QR...</div>;
  }

  if (error && !table) {
    return (
      <div className="min-h-screen bg-white p-6 text-slate-900">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Order theo mã QR</h1>
          <p className="mt-2 text-slate-700">{error}</p>
          <Link className="mt-4 inline-block font-semibold text-slate-900 hover:underline" href="/">
            Về trang chính
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Order tại bàn {table?.name}</h1>
            <p className="mt-1 text-sm text-slate-600">Chọn món từ điện thoại và gửi trực tiếp xuống hệ thống bếp.</p>
          </div>
          <Link className="text-sm font-semibold text-slate-900 hover:underline" href="/">
            Back
          </Link>
        </div>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

        {order && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Đơn đang xử lý</div>
                <div className="font-semibold text-slate-900">#{order.id.slice(0, 8).toUpperCase()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600">Trạng thái</div>
                <div className="font-semibold text-slate-900">{order.status}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {order.items.map((item) => {
                const fallbackPrice = variantMap.get(item.variant.id)?.price ?? 0;
                const unitPrice = item.variant.price ?? fallbackPrice;
                return (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div>
                      <div className="font-semibold text-slate-900">{item.variant.product.name}</div>
                      <div className="text-xs text-slate-600">x{item.quantity} · {item.status}</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{vnd(unitPrice * item.quantity)}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">Tổng cần thanh toán</div>
              <div className="text-lg font-semibold text-slate-900">{vnd(order.totalAmount)}</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => payOrder("MOMO")}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={order.paymentStatus === "PAID"}
              >
                Thanh toán MoMo
              </button>
              <button
                onClick={() => payOrder("VNPAY")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
                disabled={order.paymentStatus === "PAID"}
              >
                Thanh toán VNPay
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Thực đơn</h2>
            <div className="text-sm text-slate-600">
              Tạm tính: <span className="font-semibold text-slate-900">{vnd(cartTotal)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  activeCategory === category ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {category === "all" ? "Tất cả" : category}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-5">
            {filteredProducts.map((product) => {
              const variant = product.variants[0];
              if (!variant) return null;
              const qty = cart[variant.id] ?? 0;
              return (
                <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{product.name}</div>
                    <div className="text-xs text-slate-600">{product.station} · {vnd(variant.price)}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                      onClick={() => setCart((current) => ({ ...current, [variant.id]: Math.max(0, (current[variant.id] ?? 0) - 1) }))}
                    >
                      -
                    </button>
                    <div className="w-8 text-center text-sm font-semibold text-slate-900">{qty}</div>
                    <button
                      className="h-9 w-9 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                      onClick={() => setCart((current) => ({ ...current, [variant.id]: (current[variant.id] ?? 0) + 1 }))}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="text-sm text-slate-600">Món đã chọn sẽ gửi realtime tới POS/KDS của quán.</div>
            <button
              onClick={placeOrder}
              disabled={!table || cartLines.length === 0 || submitting}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? "Đang gửi..." : "Gửi order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
