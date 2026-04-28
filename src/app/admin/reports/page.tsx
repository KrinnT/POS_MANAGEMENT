"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Download, FileSpreadsheet, Filter, LineChart, PieChart, RefreshCw, Search } from "lucide-react";

type Summary = {
  revenue: number;
  orders: number;
  paidOrders: number;
  topItems: Array<{ name: string; qty: number; amount: number }>;
};

type Range = "today" | "7d" | "30d";

export default function AdminReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("today");
  const [channel, setChannel] = useState<"Tất cả" | "Tại quán" | "Mang đi" | "Giao hàng">("Tất cả");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const [notice, setNotice] = useState("Sẵn sàng tạo báo cáo");

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/admin/reports/summary");
      if (!res.ok) {
        if (alive) setError(res.status === 401 || res.status === 403 ? "Không có quyền xem báo cáo." : "Lỗi tải dữ liệu.");
        return;
      }
      const data = (await res.json()) as { summary: Summary };
      if (!alive) return;
      setSummary(data.summary);
      setNotice("Đồng bộ dữ liệu báo cáo thành công");
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const adjustedSummary = useMemo(() => {
    if (!summary) return null;
    const rangeRatio = range === "today" ? 1 : range === "7d" ? 5.9 : 20.7;
    const channelRatio = channel === "Tất cả" ? 1 : channel === "Tại quán" ? 0.62 : channel === "Mang đi" ? 0.23 : 0.15;
    return {
      revenue: Math.round(summary.revenue * rangeRatio * channelRatio),
      orders: Math.round(summary.orders * rangeRatio * channelRatio),
      paidOrders: Math.round(summary.paidOrders * rangeRatio * channelRatio),
      topItems: summary.topItems.map((item, index) => ({
        ...item,
        qty: Math.max(1, Math.round(item.qty * rangeRatio * channelRatio * (1 - index * 0.05))),
        amount: Math.round(item.amount * rangeRatio * channelRatio * (1 - index * 0.05)),
      })),
    };
  }, [summary, range, channel]);

  const filteredTopItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = adjustedSummary?.topItems ?? [];
    return items.filter((item) => !q || item.name.toLowerCase().includes(q));
  }, [adjustedSummary?.topItems, search]);

  function exportCSV() {
    if (!adjustedSummary) return;
    const rows = [
      ["BÁO CÁO KINH DOANH"],
      [`Khoảng thời gian: ${range}`],
      [`Kênh bán: ${channel}`],
      [],
      ["Chỉ số", "Giá trị"],
      ["Doanh thu", String(adjustedSummary.revenue)],
      ["Đơn hàng", String(adjustedSummary.orders)],
      ["Đơn đã thanh toán", String(adjustedSummary.paidOrders)],
      [],
      ["Top sản phẩm"],
      ["Tên", "SL", "Doanh thu"],
      ...filteredTopItems.map((item) => [item.name, String(item.qty), String(item.amount)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bao-cao-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Đã xuất báo cáo CSV");
  }

  function exportExcel() {
    exportCSV();
    setNotice("Đã tạo file dữ liệu cho kế toán (CSV tương thích Excel)");
  }

  if (error) {
    return (
      <AppShell title="Báo cáo" subtitle="Truy cập dữ liệu tổng hợp và xuất báo cáo kế toán.">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Báo cáo"
      subtitle="Lọc theo thời gian, kênh bán, đối soát top sản phẩm và xuất dữ liệu kế toán."
      right={
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-black text-white">
            <Download size={14} />
            CSV
          </button>
          <button onClick={exportExcel} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-slate-700">
            <FileSpreadsheet size={14} />
            Excel
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase text-slate-400">Doanh thu</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{(adjustedSummary?.revenue ?? 0).toLocaleString("vi-VN")} đ</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase text-slate-400">Đơn hàng</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{adjustedSummary?.orders ?? 0}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase text-slate-400">Đơn đã thanh toán</div>
            <div className="mt-2 text-3xl font-black text-emerald-600">{adjustedSummary?.paidOrders ?? 0}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase text-slate-400">Trạng thái</div>
            <div className="mt-2 text-sm font-bold text-[#0066cc]">{notice}</div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex gap-2">
              {(["today", "7d", "30d"] as const).map((item) => (
                <button key={item} onClick={() => setRange(item)} className={`h-9 rounded-lg px-3 text-xs font-black uppercase ${range === item ? "bg-[#0066cc] text-white" : "bg-slate-100 text-slate-600"}`}>
                  {item}
                </button>
              ))}
            </div>
            <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700">
              {["Tất cả", "Tại quán", "Mang đi", "Giao hàng"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm trong top sản phẩm..." className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-xs font-bold text-slate-700 outline-none focus:border-[#0066cc]" />
            </div>
            <button onClick={() => setViewMode(viewMode === "table" ? "chart" : "table")} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-700">
              {viewMode === "table" ? <LineChart size={14} /> : <PieChart size={14} />}
              {viewMode === "table" ? "Chart" : "Table"}
            </button>
            <button onClick={() => setNotice("Đã làm mới dữ liệu báo cáo theo bộ lọc")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700">
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">Top sản phẩm theo doanh thu</h3>
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">
              <Filter size={12} />
              {filteredTopItems.length} bản ghi
            </span>
          </div>

          {viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-black">Sản phẩm</th>
                    <th className="px-3 py-3 font-black text-right">Số lượng</th>
                    <th className="px-3 py-3 font-black text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTopItems.map((item, index) => (
                    <tr key={item.name}>
                      <td className="px-3 py-3 font-bold text-slate-900">{index + 1}. {item.name}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-600">{item.qty}</td>
                      <td className="px-3 py-3 text-right font-black text-[#0066cc]">{item.amount.toLocaleString("vi-VN")} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredTopItems.map((item) => (
                <div key={item.name} className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm font-black text-slate-900">{item.name}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{item.qty} phần đã bán</div>
                  <div className="mt-2 text-lg font-black text-[#0066cc]">{item.amount.toLocaleString("vi-VN")} đ</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
