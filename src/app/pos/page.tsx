"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgePercent,
  Banknote,
  BellRing,
  Bike,
  Calculator,
  ChefHat,
  Clock3,
  CreditCard,
  FilePlus2,
  Home,
  Layers2,
  Merge,
  Minus,
  MonitorSmartphone,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  Settings,
  SplitSquareHorizontal,
  Table2,
  Trash2,
  Truck,
  UserRound,
  Users,
  WalletCards,
  Wifi,
} from "lucide-react";
import { getSocket, joinBranch } from "@/lib/socketClient";
import { PrintBill } from "@/components/PrintBill";

type Table = { id: string; name: string; status: "AVAILABLE" | "OCCUPIED"; qrToken: string };
type Variant = { id: string; name: string | null; price: number; sku: string };
type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  station: "HOT" | "COLD" | "BAR";
  variants: Variant[];
};
type Order = {
  id: string;
  tableId: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  items: Array<{ id: string; quantity: number; status: string; note?: string | null; variant: Variant & { product: Product } }>;
  table: Table;
  pricing?: unknown;
};
type Customer = {
  id: string;
  name: string;
  phone: string;
  group: string;
  points: number;
  debt: number;
};
type SaleMode = "DINE_IN" | "TAKE_AWAY" | "DELIVERY";
type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "MOMO" | "VNPAY" | "DEBT";
type DraftLine = {
  variantId: string;
  quantity: number;
  note: string;
  discount: number;
  toppings: string[];
};
type DraftSale = {
  id: string;
  name: string;
  tableId: string | null;
  mode: SaleMode;
  customerId: string | null;
  guestCount: number;
  note: string;
  discountType: "VND" | "PERCENT";
  discountValue: number;
  surcharge: number;
  autoKitchen: boolean;
  lines: Record<string, DraftLine>;
  createdAt: string;
};

const customers: Customer[] = [
  { id: "walkin", name: "Khách lẻ", phone: "", group: "Thường", points: 0, debt: 0 },
  { id: "vip-anh", name: "Nguyễn Minh Anh", phone: "0901000001", group: "VIP", points: 240, debt: 0 },
  { id: "event", name: "Công ty Sự kiện Sao Mai", phone: "0901000002", group: "Đối tác", points: 1200, debt: 1850000 },
];

const saleModes: Array<{ value: SaleMode; label: string; icon: React.ReactNode }> = [
  { value: "DINE_IN", label: "Tại bàn", icon: <Table2 size={16} /> },
  { value: "TAKE_AWAY", label: "Mang đi", icon: <Bike size={16} /> },
  { value: "DELIVERY", label: "Giao hàng", icon: <Truck size={16} /> },
];

const paymentMethods: Array<{ value: PaymentMethod; label: string; icon: React.ReactNode }> = [
  { value: "CASH", label: "Tiền mặt", icon: <Banknote size={17} /> },
  { value: "CARD", label: "Thẻ", icon: <CreditCard size={17} /> },
  { value: "TRANSFER", label: "Chuyển khoản", icon: <WalletCards size={17} /> },
  { value: "MOMO", label: "MoMo", icon: <MonitorSmartphone size={17} /> },
  { value: "VNPAY", label: "VNPay", icon: <ReceiptText size={17} /> },
  { value: "DEBT", label: "Ghi nợ", icon: <NotebookPen size={17} /> },
];

function vnd(n: number) {
  return Math.max(0, Math.round(n)).toLocaleString("vi-VN") + " đ";
}

function createDraft(index: number): DraftSale {
  return {
    id: crypto.randomUUID(),
    name: `Hóa đơn ${index}`,
    tableId: null,
    mode: "DINE_IN",
    customerId: "walkin",
    guestCount: 1,
    note: "",
    discountType: "VND",
    discountValue: 0,
    surcharge: 0,
    autoKitchen: true,
    lines: {},
    createdAt: new Date().toISOString(),
  };
}

function methodToApi(method: PaymentMethod) {
  if (method === "CARD") return "CARD";
  if (method === "MOMO") return "MOMO";
  if (method === "VNPAY") return "VNPAY";
  if (method === "DEBT") return "OTHER";
  return "CASH";
}

export default function CashierPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drafts, setDrafts] = useState<DraftSale[]>(() => [createDraft(1)]);
  const [activeDraftId, setActiveDraftId] = useState<string>(() => drafts[0]?.id ?? "");
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [tableFilter, setTableFilter] = useState<"ALL" | "AVAILABLE" | "OCCUPIED">("ALL");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [customerPaid, setCustomerPaid] = useState(0);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [shiftOpen, setShiftOpen] = useState(true);
  const [syncMode, setSyncMode] = useState<"online" | "offline">("online");

  const activeDraft = drafts.find((draft) => draft.id === activeDraftId) ?? drafts[0];
  const activeTable = tables.find((table) => table.id === activeDraft?.tableId) ?? null;
  const activeCustomer = customers.find((customer) => customer.id === activeDraft?.customerId) ?? customers[0];

  const variantMap = useMemo(() => {
    const map = new Map<string, Variant & { product: Product }>();
    products.forEach((product) => product.variants.forEach((variant) => map.set(variant.id, { ...variant, product })));
    return map;
  }, [products]);

  const draftLines = useMemo(() => {
    if (!activeDraft) return [];
    return Object.values(activeDraft.lines)
      .map((line) => ({ ...line, variant: variantMap.get(line.variantId) }))
      .filter((line): line is DraftLine & { variant: Variant & { product: Product } } => Boolean(line.variant));
  }, [activeDraft, variantMap]);

  const currentTableOrder = useMemo(
    () => orders.find((order) => order.tableId === activeDraft?.tableId && order.paymentStatus !== "PAID"),
    [activeDraft?.tableId, orders],
  );

  const checkoutOrder = orders.find((order) => order.id === checkoutOrderId) ?? null;
  const printOrder = orders.find((order) => order.id === printOrderId) ?? null;

  const categories = useMemo(() => ["all", ...new Set(products.map((product) => product.category))], [products]);
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const byCategory = activeCategory === "all" || product.category === activeCategory;
      const bySearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.variants.some((variant) => variant.sku.toLowerCase().includes(q));
      return byCategory && bySearch;
    });
  }, [activeCategory, products, searchQuery]);

  const filteredTables = useMemo(() => {
    return tables.filter((table) => tableFilter === "ALL" || table.status === tableFilter);
  }, [tableFilter, tables]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    return customers.filter((customer) => !q || `${customer.name} ${customer.phone}`.toLowerCase().includes(q));
  }, [customerQuery]);

  const draftSubtotal = draftLines.reduce((sum, line) => {
    const lineTotal = line.variant.price * line.quantity - line.discount * line.quantity;
    const toppingTotal = line.toppings.length * 5000 * line.quantity;
    return sum + lineTotal + toppingTotal;
  }, 0);
  const draftDiscount =
    activeDraft?.discountType === "PERCENT"
      ? Math.round(draftSubtotal * Math.min(activeDraft.discountValue, 100) / 100)
      : activeDraft?.discountValue ?? 0;
  const draftServiceCharge = Math.round(draftSubtotal * 0.05);
  const draftVat = Math.round((draftSubtotal - draftDiscount + (activeDraft?.surcharge ?? 0)) * 0.08);
  const draftTotal = Math.max(0, draftSubtotal - draftDiscount + (activeDraft?.surcharge ?? 0) + draftVat);
  const existingOrderTotal = currentTableOrder?.totalAmount ?? 0;

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const meRes = await fetch("/api/auth/me");
        const me = (await meRes.json()) as { user: { branchId: string | null } | null };
        const branchId = me.user?.branchId ?? null;
        const [tRes, mRes, oRes] = await Promise.all([
          fetch(`/api/tables${branchId ? `?branchId=${branchId}` : ""}`),
          fetch(`/api/menu${branchId ? `?branchId=${branchId}` : ""}`),
          fetch(`/api/orders${branchId ? `?branchId=${branchId}` : ""}`),
        ]);
        const tData = (await tRes.json()) as { tables?: Table[] };
        const mData = (await mRes.json()) as { products?: Product[] };
        const oData = (await oRes.json()) as { orders?: Order[] };
        if (!alive) return;
        setTables(tData.tables ?? []);
        setProducts(mData.products ?? []);
        setOrders(oData.orders ?? []);

        const socket = branchId ? await joinBranch(branchId) : await getSocket();
        socket.on("order:created", (order: Order) => {
          setOrders((prev) => [order, ...prev.filter((item) => item.id !== order.id)].slice(0, 80));
          setTables((prev) => prev.map((table) => (table.id === order.tableId ? { ...table, status: "OCCUPIED" } : table)));
        });
        socket.on("order:updated", (order: Order) => {
          setOrders((prev) => prev.map((item) => (item.id === order.id ? order : item)));
          if (order.paymentStatus === "PAID" || order.status === "COMPLETED") {
            setTables((prev) => prev.map((table) => (table.id === order.tableId ? { ...table, status: "AVAILABLE" } : table)));
          }
        });
      } catch {
        setSyncMode("offline");
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  function updateDraft(next: Partial<DraftSale>) {
    setDrafts((current) => current.map((draft) => (draft.id === activeDraft?.id ? { ...draft, ...next } : draft)));
  }

  function updateLine(variantId: string, next: Partial<DraftLine>) {
    if (!activeDraft) return;
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== activeDraft.id) return draft;
        const line = draft.lines[variantId];
        if (!line) return draft;
        return { ...draft, lines: { ...draft.lines, [variantId]: { ...line, ...next } } };
      }),
    );
  }

  function addDraft() {
    const next = createDraft(drafts.length + 1);
    setDrafts((current) => [...current, next]);
    setActiveDraftId(next.id);
  }

  function closeDraft(id: string) {
    setDrafts((current) => {
      if (current.length === 1) return current;
      const next = current.filter((draft) => draft.id !== id);
      if (activeDraftId === id) setActiveDraftId(next[0]?.id ?? "");
      return next;
    });
  }

  function addToCart(product: Product) {
    if (!activeDraft) return;
    const variantId = product.variants[0]?.id;
    if (!variantId) return;
    setSelectedLineId(variantId);
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== activeDraft.id) return draft;
        const existing = draft.lines[variantId];
        return {
          ...draft,
          lines: {
            ...draft.lines,
            [variantId]: existing
              ? { ...existing, quantity: existing.quantity + 1 }
              : { variantId, quantity: 1, note: "", discount: 0, toppings: [] },
          },
        };
      }),
    );
  }

  function removeLine(variantId: string) {
    if (!activeDraft) return;
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== activeDraft.id) return draft;
        const nextLines = { ...draft.lines };
        delete nextLines[variantId];
        return { ...draft, lines: nextLines };
      }),
    );
    if (selectedLineId === variantId) setSelectedLineId(null);
  }

  function splitSelectedLine() {
    if (!activeDraft || !selectedLineId) return;
    const selected = activeDraft.lines[selectedLineId];
    if (!selected || selected.quantity < 2) return;
    const next = createDraft(drafts.length + 1);
    next.tableId = activeDraft.tableId;
    next.mode = activeDraft.mode;
    next.customerId = activeDraft.customerId;
    next.lines = { [selectedLineId]: { ...selected, quantity: 1 } };
    updateLine(selectedLineId, { quantity: selected.quantity - 1 });
    setDrafts((current) => [...current, next]);
    setActiveDraftId(next.id);
  }

  function mergeIntoCurrent(sourceId: string) {
    if (!activeDraft || sourceId === activeDraft.id) return;
    const source = drafts.find((draft) => draft.id === sourceId);
    if (!source) return;
    const merged = { ...activeDraft.lines };
    Object.values(source.lines).forEach((line) => {
      merged[line.variantId] = merged[line.variantId]
        ? { ...merged[line.variantId], quantity: merged[line.variantId].quantity + line.quantity }
        : line;
    });
    setDrafts((current) =>
      current
        .filter((draft) => draft.id !== sourceId)
        .map((draft) => (draft.id === activeDraft.id ? { ...draft, lines: merged } : draft)),
    );
  }

  async function sendToKitchen() {
    if (!activeDraft?.tableId || draftLines.length === 0) return null;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId: activeDraft.tableId,
        items: draftLines.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
          note: [line.note, line.toppings.length ? `Topping: ${line.toppings.join(", ")}` : ""].filter(Boolean).join(" | "),
        })),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { order: Order };
    setOrders((prev) => [data.order, ...prev.filter((order) => order.id !== data.order.id)]);
    setDrafts((current) =>
      current.map((draft) => (draft.id === activeDraft.id ? { ...draft, lines: {}, note: "", discountValue: 0, surcharge: 0 } : draft)),
    );
    return data.order;
  }

  async function openCheckout() {
    if (currentTableOrder) {
      setCustomerPaid(currentTableOrder.totalAmount);
      setCheckoutOrderId(currentTableOrder.id);
      return;
    }
    const order = await sendToKitchen();
    if (order) {
      setCustomerPaid(order.totalAmount);
      setCheckoutOrderId(order.id);
    }
  }

  async function confirmPayment() {
    if (!checkoutOrder) return;
    await fetch(`/api/orders/${checkoutOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "PAID", paymentMethod: methodToApi(paymentMethod), status: "COMPLETED" }),
    });
    setOrders((current) =>
      current.map((order) =>
        order.id === checkoutOrder.id ? { ...order, paymentStatus: "PAID", paymentMethod: paymentMethod, status: "COMPLETED" } : order,
      ),
    );
    setCheckoutOrderId(null);
    setPrintOrderId(checkoutOrder.id);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f3f6f9] text-slate-900">
      <nav className="flex h-14 shrink-0 items-center gap-3 bg-[#0066cc] px-4 text-white shadow-lg">
        <Link href="/admin" className="flex items-center gap-2 font-black">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0066cc]">K</span>
          <span>KiotViet POS</span>
        </Link>
        <div className="flex h-9 flex-1 max-w-2xl items-center rounded-lg bg-white/12 px-3">
          <Search size={18} className="text-white/60" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm món, mã hàng, barcode (F3)"
            className="h-full flex-1 bg-transparent px-3 text-sm font-semibold outline-none placeholder:text-white/55"
          />
        </div>
        <button
          onClick={() => setSyncMode(syncMode === "online" ? "offline" : "online")}
          className="hidden h-9 items-center gap-2 rounded-lg bg-white/12 px-3 text-xs font-bold lg:flex"
        >
          <Wifi size={16} />
          {syncMode === "online" ? "Có Internet" : "Offline"}
        </button>
        <button
          onClick={() => setShiftOpen(!shiftOpen)}
          className={`hidden h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold lg:flex ${shiftOpen ? "bg-emerald-500" : "bg-amber-500"}`}
        >
          <Clock3 size={16} />
          {shiftOpen ? "Ca đang mở" : "Ca đã đóng"}
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/12">
          <Settings size={18} />
        </button>
      </nav>

      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3">
        {drafts.map((draft) => (
          <button
            key={draft.id}
            onClick={() => setActiveDraftId(draft.id)}
            className={`flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-black ${
              draft.id === activeDraft?.id ? "border-[#0066cc] bg-blue-50 text-[#0066cc]" : "border-slate-200 text-slate-600"
            }`}
          >
            <ReceiptText size={15} />
            {draft.name}
            {Object.keys(draft.lines).length > 0 && <span className="rounded bg-slate-200 px-1.5 text-[10px] text-slate-700">{Object.keys(draft.lines).length}</span>}
            {drafts.length > 1 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  closeDraft(draft.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.stopPropagation();
                    closeDraft(draft.id);
                  }
                }}
                className="text-slate-400 hover:text-red-600"
              >
                ×
              </span>
            )}
          </button>
        ))}
        <button onClick={addDraft} className="flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-600 hover:bg-slate-200">
          <FilePlus2 size={15} />
          Phiếu mới
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs font-bold text-slate-500">
          <BellRing size={15} />
          {activeDraft?.autoKitchen ? "Báo bếp tự động" : "Báo bếp thủ công"}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_470px]">
        <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">Phòng/Bàn</div>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <RefreshCw size={15} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(["ALL", "AVAILABLE", "OCCUPIED"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setTableFilter(status)}
                  className={`h-8 rounded-md text-[10px] font-black ${tableFilter === status ? "bg-[#0066cc] text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {status === "ALL" ? "Tất cả" : status === "AVAILABLE" ? "Trống" : "Có khách"}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-2">
              {filteredTables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => updateDraft({ tableId: table.id, mode: "DINE_IN" })}
                  className={`min-h-20 rounded-lg border p-3 text-left transition ${
                    activeDraft?.tableId === table.id
                      ? "border-[#0066cc] bg-blue-50"
                      : table.status === "OCCUPIED"
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Table2 size={17} className={table.status === "OCCUPIED" ? "text-amber-600" : "text-slate-500"} />
                    <span className="rounded bg-white/70 px-1.5 text-[9px] font-black uppercase text-slate-500">
                      {table.status === "OCCUPIED" ? "Có khách" : "Trống"}
                    </span>
                  </div>
                  <div className="mt-3 text-sm font-black text-slate-900">{table.name}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 p-3">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={splitSelectedLine} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-100 text-xs font-black text-slate-700">
                <SplitSquareHorizontal size={16} />
                Tách món
              </button>
              <button
                onClick={() => drafts.find((draft) => draft.id !== activeDraft?.id) && mergeIntoCurrent(drafts.find((draft) => draft.id !== activeDraft?.id)?.id ?? "")}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-100 text-xs font-black text-slate-700"
              >
                <Merge size={16} />
                Ghép đơn
              </button>
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col bg-white">
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 p-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`h-9 shrink-0 rounded-lg px-4 text-xs font-black ${activeCategory === category ? "bg-[#0066cc] text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {category === "all" ? "Tất cả" : category}
              </button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-4 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
            {filteredProducts.map((product) => {
              const variant = product.variants[0];
              const quantity = variant ? activeDraft?.lines[variant.id]?.quantity ?? 0 : 0;
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group relative flex min-h-36 flex-col rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-[#0066cc] hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[#0066cc]">
                      <ChefHat size={21} />
                    </div>
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black text-[#0066cc]">{vnd(variant?.price ?? 0)}</span>
                  </div>
                  <div className="mt-3 line-clamp-2 text-sm font-black text-slate-900">{product.name}</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-400">{variant?.sku}</div>
                  <div className="mt-auto flex items-center justify-between pt-3 text-[10px] font-black uppercase text-slate-400">
                    <span>{product.category}</span>
                    <Plus size={16} className="text-slate-500 group-hover:text-[#0066cc]" />
                  </div>
                  {quantity > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white shadow-lg">
                      {quantity}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </main>

        <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-[#f8fafc]">
          <div className="shrink-0 border-b border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Đơn hiện tại</div>
                <div className="mt-1 flex items-center gap-2 text-lg font-black text-slate-900">
                  <Home size={18} />
                  {activeTable?.name ?? (activeDraft?.mode === "TAKE_AWAY" ? "Mang đi" : activeDraft?.mode === "DELIVERY" ? "Giao hàng" : "Chưa chọn bàn")}
                </div>
              </div>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <MoreHorizontal size={18} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {saleModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => updateDraft({ mode: mode.value })}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-black ${
                    activeDraft?.mode === mode.value ? "bg-[#0066cc] text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {mode.icon}
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-b border-slate-200 bg-white p-4">
            <div className="grid grid-cols-[1fr_90px] gap-2">
              <div>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <UserRound size={14} />
                  Khách hàng
                </div>
                <input
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder={activeCustomer?.name ?? "Tìm khách hàng"}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#0066cc]"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <Users size={14} />
                  Khách
                </div>
                <input
                  type="number"
                  min={1}
                  value={activeDraft?.guestCount ?? 1}
                  onChange={(event) => updateDraft({ guestCount: Number(event.target.value) })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#0066cc]"
                />
              </div>
            </div>
            {customerQuery && (
              <div className="mt-2 max-h-28 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      updateDraft({ customerId: customer.id });
                      setCustomerQuery("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold hover:bg-blue-50"
                  >
                    <span>{customer.name}</span>
                    <span className="text-slate-400">{customer.phone || customer.group}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <span className="font-bold text-slate-600">{activeCustomer?.group} · Điểm {activeCustomer?.points}</span>
              <span className="font-black text-slate-900">Nợ {vnd(activeCustomer?.debt ?? 0)}</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {draftLines.map((line) => (
                <button
                  key={line.variantId}
                  onClick={() => setSelectedLineId(line.variantId)}
                  className={`w-full rounded-lg border bg-white p-3 text-left shadow-sm ${
                    selectedLineId === line.variantId ? "border-[#0066cc] ring-2 ring-blue-100" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[#0066cc]">
                      <Layers2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-slate-900">{line.variant.product.name}</div>
                      <div className="mt-0.5 text-xs font-bold text-[#0066cc]">{vnd(line.variant.price)}</div>
                      {line.note && <div className="mt-1 truncate text-[11px] font-semibold text-amber-600">Ghi chú: {line.note}</div>}
                      {line.toppings.length > 0 && <div className="mt-1 truncate text-[11px] font-semibold text-emerald-600">Topping: {line.toppings.join(", ")}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">{vnd((line.variant.price - line.discount + line.toppings.length * 5000) * line.quantity)}</div>
                      {line.discount > 0 && <div className="text-[10px] font-bold text-red-500">-{vnd(line.discount * line.quantity)}</div>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (line.quantity <= 1) {
                            removeLine(line.variantId);
                          } else {
                            updateLine(line.variantId, { quantity: line.quantity - 1 });
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.stopPropagation();
                            if (line.quantity <= 1) {
                              removeLine(line.variantId);
                            } else {
                              updateLine(line.variantId, { quantity: line.quantity - 1 });
                            }
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                      >
                        <Minus size={15} />
                      </span>
                      <span className="w-8 text-center text-sm font-black">{line.quantity}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          updateLine(line.variantId, { quantity: line.quantity + 1 });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.stopPropagation();
                            updateLine(line.variantId, { quantity: line.quantity + 1 });
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0066cc] text-white"
                      >
                        <Plus size={15} />
                      </span>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeLine(line.variantId);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.stopPropagation();
                          removeLine(line.variantId);
                        }
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {selectedLineId && activeDraft?.lines[selectedLineId] && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Chi tiết món</div>
                <input
                  value={activeDraft.lines[selectedLineId].note}
                  onChange={(event) => updateLine(selectedLineId, { note: event.target.value })}
                  placeholder="Ghi chú món: ít đá, không hành..."
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold outline-none focus:border-[#0066cc]"
                />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {["Ít đá", "Thêm sốt", "Cay"].map((topping) => {
                    const active = activeDraft.lines[selectedLineId].toppings.includes(topping);
                    return (
                      <button
                        key={topping}
                        onClick={() =>
                          updateLine(selectedLineId, {
                            toppings: active
                              ? activeDraft.lines[selectedLineId].toppings.filter((item) => item !== topping)
                              : [...activeDraft.lines[selectedLineId].toppings, topping],
                          })
                        }
                        className={`h-8 rounded-md text-[11px] font-black ${active ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"}`}
                      >
                        {topping}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Giảm/món
                    <input
                      type="number"
                      value={activeDraft.lines[selectedLineId].discount}
                      onChange={(event) => updateLine(selectedLineId, { discount: Number(event.target.value) })}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900 outline-none focus:border-[#0066cc]"
                    />
                  </label>
                  <button onClick={splitSelectedLine} className="mt-4 flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-100 text-xs font-black text-slate-700">
                    <SplitSquareHorizontal size={15} />
                    Tách dòng
                  </button>
                </div>
              </div>
            )}

            {currentTableOrder && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Hóa đơn đã gửi bếp</div>
                <div className="mt-2 space-y-2">
                  {currentTableOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{item.quantity} × {item.variant.product.name}</span>
                      <span>{vnd(item.quantity * item.variant.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Giảm giá HĐ
                <div className="mt-1 flex rounded-lg border border-slate-200">
                  <select
                    value={activeDraft?.discountType ?? "VND"}
                    onChange={(event) => updateDraft({ discountType: event.target.value as "VND" | "PERCENT" })}
                    className="w-16 rounded-l-lg border-r border-slate-200 bg-slate-50 px-2 text-xs font-black outline-none"
                  >
                    <option>VND</option>
                    <option>PERCENT</option>
                  </select>
                  <input
                    type="number"
                    value={activeDraft?.discountValue ?? 0}
                    onChange={(event) => updateDraft({ discountValue: Number(event.target.value) })}
                    className="h-9 min-w-0 flex-1 rounded-r-lg px-2 text-sm font-bold text-slate-900 outline-none"
                  />
                </div>
              </label>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Phụ thu
                <input
                  type="number"
                  value={activeDraft?.surcharge ?? 0}
                  onChange={(event) => updateDraft({ surcharge: Number(event.target.value) })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900 outline-none focus:border-[#0066cc]"
                />
              </label>
            </div>
            <textarea
              value={activeDraft?.note ?? ""}
              onChange={(event) => updateDraft({ note: event.target.value })}
              placeholder="Ghi chú hóa đơn, thông tin giao hàng, yêu cầu khách..."
              className="mt-2 h-16 w-full resize-none rounded-lg border border-slate-200 p-3 text-xs font-semibold outline-none focus:border-[#0066cc]"
            />
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500"><span>Tạm tính</span><span>{vnd(draftSubtotal + existingOrderTotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Giảm giá</span><span>-{vnd(draftDiscount)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Phí dịch vụ/VAT</span><span>{vnd(draftServiceCharge + draftVat)}</span></div>
              <div className="flex items-center justify-between pt-2 text-xl font-black text-slate-900">
                <span>Cần thanh toán</span>
                <span className="text-[#0066cc]">{vnd(draftTotal + existingOrderTotal)}</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={sendToKitchen} disabled={!activeDraft?.tableId || draftLines.length === 0} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-100 text-xs font-black text-slate-700 disabled:opacity-40">
                <Send size={16} />
                Báo bếp
              </button>
              <button onClick={openCheckout} disabled={!currentTableOrder && draftLines.length === 0} className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0066cc] text-sm font-black text-white disabled:opacity-40">
                <Calculator size={18} />
                Thanh toán
              </button>
            </div>
          </div>
        </aside>
      </div>

      {checkoutOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-6">
          <div className="grid h-full max-h-[820px] w-full max-w-6xl grid-cols-[1fr_430px] overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex min-h-0 flex-col p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-[#0066cc]">Thanh toán hóa đơn</div>
                  <h2 className="mt-1 text-3xl font-black text-slate-900">#{checkoutOrder.id.slice(0, 8)}</h2>
                  <div className="mt-2 flex gap-2 text-xs font-black text-slate-500">
                    <span className="rounded bg-slate-100 px-2 py-1">{checkoutOrder.table.name}</span>
                    <span className="rounded bg-slate-100 px-2 py-1">{activeCustomer?.name}</span>
                  </div>
                </div>
                <button onClick={() => setCheckoutOrderId(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">Đóng</button>
              </div>
              <div className="mt-8 min-h-0 flex-1 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="border-b border-slate-100 py-3">Món</th>
                      <th className="border-b border-slate-100 py-3 text-center">SL</th>
                      <th className="border-b border-slate-100 py-3 text-right">Đơn giá</th>
                      <th className="border-b border-slate-100 py-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {checkoutOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-4 font-black text-slate-800">
                          {item.variant.product.name}
                          {item.note && <div className="mt-1 text-[11px] font-semibold text-amber-600">{item.note}</div>}
                        </td>
                        <td className="py-4 text-center font-black">{item.quantity}</td>
                        <td className="py-4 text-right font-semibold text-slate-500">{vnd(item.variant.price)}</td>
                        <td className="py-4 text-right font-black">{vnd(item.quantity * item.variant.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-between border-t border-slate-100 pt-5">
                <div className="text-xs font-bold text-slate-400">
                  <div>Vào lúc {new Date(checkoutOrder.createdAt).toLocaleString("vi-VN")}</div>
                  <div className="mt-1">Báo bếp khi thanh toán: {activeDraft?.autoKitchen ? "Có" : "Không"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-400">Tổng phải thu</div>
                  <div className="text-4xl font-black text-[#0066cc]">{vnd(checkoutOrder.totalAmount)}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col bg-slate-50 p-6">
              <div className="text-sm font-black uppercase tracking-wider text-slate-500">Phương thức thanh toán</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    className={`flex h-12 items-center justify-center gap-2 rounded-lg border text-xs font-black ${
                      paymentMethod === method.value ? "border-[#0066cc] bg-white text-[#0066cc]" : "border-transparent bg-white text-slate-500"
                    }`}
                  >
                    {method.icon}
                    {method.label}
                  </button>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Khách đưa / đã chuyển
                  <input
                    type="number"
                    value={customerPaid}
                    onChange={(event) => setCustomerPaid(Number(event.target.value))}
                    className="mt-2 h-14 w-full rounded-lg border border-slate-200 bg-white px-4 text-right text-2xl font-black outline-none focus:border-[#0066cc]"
                  />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[checkoutOrder.totalAmount, 200000, 500000].map((value) => (
                    <button key={value} onClick={() => setCustomerPaid(value)} className="h-10 rounded-lg bg-white text-xs font-black text-slate-600">
                      {value === checkoutOrder.totalAmount ? "Đủ tiền" : `${value / 1000}k`}
                    </button>
                  ))}
                </div>
                <div className="rounded-lg bg-white p-4">
                  <div className="flex justify-between text-sm font-bold text-slate-500"><span>Cần thu</span><span>{vnd(checkoutOrder.totalAmount)}</span></div>
                  <div className="mt-2 flex justify-between text-sm font-bold text-slate-500"><span>Khách đưa</span><span>{vnd(customerPaid)}</span></div>
                  <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-lg font-black text-slate-900">
                    <span>Trả khách</span>
                    <span>{vnd(customerPaid - checkoutOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-auto grid grid-cols-2 gap-2">
                <button onClick={() => setPrintOrderId(checkoutOrder.id)} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-white text-sm font-black text-slate-700">
                  <Printer size={17} />
                  In tạm tính
                </button>
                <button onClick={confirmPayment} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0066cc] text-sm font-black text-white">
                  <BadgePercent size={17} />
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {printOrderId && (
        <PrintBill
          orderId={printOrderId}
          tableName={printOrder?.table.name ?? ""}
          items={
            printOrder?.items.map((item) => ({
              name: item.variant.product.name,
              quantity: item.quantity,
              price: item.variant.price,
            })) ?? []
          }
          totalAmount={printOrder?.totalAmount ?? 0}
          onClose={() => setPrintOrderId(null)}
        />
      )}
    </div>
  );
}
