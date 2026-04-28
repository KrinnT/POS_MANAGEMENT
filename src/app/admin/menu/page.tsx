"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Copy, Download, Filter, PackagePlus, Pencil, Search, Trash2, Upload } from "lucide-react";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  status: "Đang bán" | "Tạm dừng";
};

type MenuVariant = {
  id: string;
  sku: string;
  name: string | null;
  price: number;
};

type MenuProduct = {
  name: string;
  category: string;
  variants: MenuVariant[];
};

export default function EnterpriseMenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState<"Tất cả" | "Đang bán" | "Tạm dừng">("Tất cả");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [notice, setNotice] = useState("Sẵn sàng thao tác hàng hóa");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/menu");
      const data = (await res.json()) as { products: MenuProduct[] };
      const flat = data.products.flatMap((p, pIndex) =>
        p.variants.map((v, vIndex) => ({
          id: v.id,
          sku: v.sku,
          name: `${p.name}${v.name ? ` (${v.name})` : ""}`,
          category: p.category,
          price: v.price,
          stock: 100 - pIndex * 3 - vIndex,
          status: pIndex % 7 === 0 ? ("Tạm dừng" as const) : ("Đang bán" as const),
        })),
      );
      setProducts(flat);
      setLoading(false);
    }
    void load();
  }, []);

  const categories = useMemo(() => ["Tất cả", ...new Set(products.map((p) => p.category))], [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const byText = !q || `${p.name} ${p.sku}`.toLowerCase().includes(q);
      const byCategory = categoryFilter === "Tất cả" || p.category === categoryFilter;
      const byStatus = statusFilter === "Tất cả" || p.status === statusFilter;
      return byText && byCategory && byStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  const selectedProducts = filtered.filter((p) => selectedIds.includes(p.id));
  const totalValue = filtered.reduce((sum, p) => sum + p.price * p.stock, 0);

  function toggleSelect(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function updateRow(next: Product) {
    setProducts((current) => current.map((item) => (item.id === next.id ? next : item)));
    setEditing(null);
    setNotice(`Đã cập nhật ${next.name}`);
  }

  function cloneSelected() {
    if (selectedProducts.length === 0) return;
    const clones = selectedProducts.map((item, index) => ({
      ...item,
      id: `${item.id}-clone-${Date.now()}-${index}`,
      sku: `${item.sku}-C${index + 1}`,
      name: `${item.name} (Bản sao)`,
      status: "Tạm dừng" as const,
    }));
    setProducts((current) => [...clones, ...current]);
    setSelectedIds(clones.map((item) => item.id));
    setNotice(`Đã nhân bản ${clones.length} hàng hóa`);
  }

  function removeSelected() {
    if (selectedProducts.length === 0) return;
    const removing = new Set(selectedProducts.map((item) => item.id));
    setProducts((current) => current.filter((item) => !removing.has(item.id)));
    setSelectedIds([]);
    setNotice(`Đã xóa ${removing.size} hàng hóa khỏi danh mục`);
  }

  function setSelectedStatus(status: "Đang bán" | "Tạm dừng") {
    if (selectedProducts.length === 0) return;
    const target = new Set(selectedProducts.map((item) => item.id));
    setProducts((current) => current.map((item) => (target.has(item.id) ? { ...item, status } : item)));
    setNotice(`Đã cập nhật trạng thái ${status.toLowerCase()} cho ${target.size} hàng hóa`);
  }

  function exportCSV() {
    const rows = [
      ["SKU", "Tên hàng", "Nhóm", "Giá", "Tồn", "Trạng thái"],
      ...filtered.map((item) => [item.sku, item.name, item.category, String(item.price), String(item.stock), item.status]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hang-hoa-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Đã xuất file danh mục hàng hóa");
  }

  return (
    <AppShell title="Hàng hóa" subtitle="Đầy đủ luồng lọc, chọn nhiều, sao chép, dừng bán, cập nhật giá và xuất dữ liệu.">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Số mặt hàng</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{filtered.length}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Giá trị tồn (ước tính)</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{totalValue.toLocaleString("vi-VN")} đ</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Trạng thái thao tác</div>
            <div className="mt-2 text-sm font-bold text-[#0066cc]">{notice}</div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm SKU, tên hàng..."
                className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#0066cc]"
              />
            </div>
            <div className="flex gap-2">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
                {["Tất cả", "Đang bán", "Tạm dừng"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={cloneSelected} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-700">
              <Copy size={15} />
              Sao chép
            </button>
            <button onClick={() => setSelectedStatus("Đang bán")} className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-100 px-3 text-xs font-black text-emerald-700">
              <PackagePlus size={15} />
              Mở bán
            </button>
            <button onClick={() => setSelectedStatus("Tạm dừng")} className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber-100 px-3 text-xs font-black text-amber-700">
              <Filter size={15} />
              Tạm dừng
            </button>
            <button onClick={removeSelected} className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-100 px-3 text-xs font-black text-rose-700">
              <Trash2 size={15} />
              Xóa chọn
            </button>
            <button onClick={exportCSV} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-black text-white">
              <Download size={15} />
              Xuất CSV
            </button>
            <button onClick={() => setNotice("Đã mở trình nhập dữ liệu mẫu (demo)") } className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700">
              <Upload size={15} />
              Import
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3"><input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filtered.length} onChange={(e) => setSelectedIds(e.target.checked ? filtered.map((item) => item.id) : [])} /></th>
                  <th className="px-3 py-3 font-black">SKU</th>
                  <th className="px-3 py-3 font-black">Tên hàng</th>
                  <th className="px-3 py-3 font-black">Nhóm</th>
                  <th className="px-3 py-3 font-black text-right">Giá</th>
                  <th className="px-3 py-3 font-black text-right">Tồn</th>
                  <th className="px-3 py-3 font-black">Trạng thái</th>
                  <th className="px-3 py-3 font-black text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-slate-400">Đang tải dữ liệu hàng hóa...</td></tr>
                ) : filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40">
                    <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.sku}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">{item.name}</td>
                    <td className="px-3 py-3 text-slate-600">{item.category}</td>
                    <td className="px-3 py-3 text-right font-bold text-[#0066cc]">{item.price.toLocaleString("vi-VN")} đ</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-600">{item.stock}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${item.status === "Đang bán" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditing(item)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600"><Pencil size={14} /></button>
                        <button onClick={() => { setSelectedIds([item.id]); removeSelected(); }} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-rose-600"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-black text-slate-900">Cập nhật hàng hóa</h3>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              <label className="text-xs font-black uppercase text-slate-500">Tên hàng
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
              <label className="text-xs font-black uppercase text-slate-500">SKU
                <input value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
              <label className="text-xs font-black uppercase text-slate-500">Giá bán
                <input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
              <label className="text-xs font-black uppercase text-slate-500">Tồn kho
                <input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button onClick={() => setEditing(null)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600">Hủy</button>
              <button onClick={() => updateRow(editing)} className="h-10 rounded-lg bg-[#0066cc] px-4 text-sm font-bold text-white">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
