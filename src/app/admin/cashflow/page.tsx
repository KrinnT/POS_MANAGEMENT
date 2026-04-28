"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Banknote, Download, HandCoins, PlusCircle, Search, Wallet } from "lucide-react";

type CashEntry = {
  id: string;
  code: string;
  type: "Thu" | "Chi";
  category: string;
  partner: string;
  amount: number;
  createdDate: string;
  note: string;
};

const seedEntries: CashEntry[] = [
  { id: "1", code: "PT00043", type: "Thu", category: "Bán hàng", partner: "Ca sáng", amount: 3_280_000, createdDate: "2026-04-29", note: "Nộp tiền mặt cuối ca" },
  { id: "2", code: "PC00018", type: "Chi", category: "Nhập hàng", partner: "Fresh Food VN", amount: 1_250_000, createdDate: "2026-04-29", note: "Thanh toán rau củ" },
  { id: "3", code: "PT00044", type: "Thu", category: "Thu hồi công nợ", partner: "Công ty Sao Mai", amount: 900_000, createdDate: "2026-04-28", note: "Thu nợ hóa đơn HD000101" },
];

export default function CashflowPage() {
  const [entries, setEntries] = useState<CashEntry[]>(seedEntries);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"Tất cả" | "Thu" | "Chi">("Tất cả");
  const [notice, setNotice] = useState("Sổ quỹ đã đồng bộ");
  const [draft, setDraft] = useState<Omit<CashEntry, "id">>({
    code: "",
    type: "Thu",
    category: "Khác",
    partner: "",
    amount: 0,
    createdDate: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((item) => {
      const bySearch = !q || `${item.code} ${item.partner} ${item.note}`.toLowerCase().includes(q);
      const byType = typeFilter === "Tất cả" || item.type === typeFilter;
      return bySearch && byType;
    });
  }, [entries, search, typeFilter]);

  const totals = useMemo(() => {
    const income = filtered.filter((item) => item.type === "Thu").reduce((sum, item) => sum + item.amount, 0);
    const expense = filtered.filter((item) => item.type === "Chi").reduce((sum, item) => sum + item.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filtered]);

  function addEntry() {
    if (!draft.code || !draft.partner || draft.amount <= 0) return;
    setEntries((current) => [{ ...draft, id: crypto.randomUUID() }, ...current]);
    setNotice(`Đã ghi nhận phiếu ${draft.code}`);
    setDraft({
      code: "",
      type: "Thu",
      category: "Khác",
      partner: "",
      amount: 0,
      createdDate: new Date().toISOString().slice(0, 10),
      note: "",
    });
  }

  function removeEntry(id: string) {
    const target = entries.find((item) => item.id === id);
    setEntries((current) => current.filter((item) => item.id !== id));
    if (target) setNotice(`Đã hủy phiếu ${target.code}`);
  }

  function exportCSV() {
    const rows = [
      ["Mã phiếu", "Loại", "Khoản mục", "Đối tượng", "Số tiền", "Ngày", "Ghi chú"],
      ...filtered.map((item) => [item.code, item.type, item.category, item.partner, String(item.amount), item.createdDate, item.note]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `so-quy-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Đã xuất sổ quỹ ra CSV");
  }

  return (
    <AppShell
      title="Sổ quỹ"
      subtitle="Theo dõi thu chi theo ca, đối tác và khoản mục với đối soát số dư cuối ngày."
      right={
        <button onClick={exportCSV} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-black text-white">
          <Download size={15} />
          Xuất sổ quỹ
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase text-slate-400">Tổng thu</div>
            <div className="mt-2 text-3xl font-black text-emerald-600">{totals.income.toLocaleString("vi-VN")} đ</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase text-slate-400">Tổng chi</div>
            <div className="mt-2 text-3xl font-black text-rose-600">{totals.expense.toLocaleString("vi-VN")} đ</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase text-slate-400">Số dư</div>
            <div className="mt-2 text-3xl font-black text-[#0066cc]">{totals.balance.toLocaleString("vi-VN")} đ</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase text-slate-400">Trạng thái</div>
            <div className="mt-2 text-sm font-bold text-[#0066cc]">{notice}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-black text-slate-900">Ghi nhận phiếu thu/chi</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-black uppercase text-slate-400">Mã phiếu
                <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-black uppercase text-slate-400">Loại
                  <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as "Thu" | "Chi" })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900">
                    <option>Thu</option>
                    <option>Chi</option>
                  </select>
                </label>
                <label className="block text-xs font-black uppercase text-slate-400">Ngày
                  <input type="date" value={draft.createdDate} onChange={(e) => setDraft({ ...draft, createdDate: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
                </label>
              </div>
              <label className="block text-xs font-black uppercase text-slate-400">Khoản mục
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900">
                  {["Bán hàng", "Thu hồi công nợ", "Nhập hàng", "Lương", "Chi phí vận hành", "Khác"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-xs font-black uppercase text-slate-400">Đối tượng
                <input value={draft.partner} onChange={(e) => setDraft({ ...draft, partner: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
              <label className="block text-xs font-black uppercase text-slate-400">Số tiền
                <input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
              <label className="block text-xs font-black uppercase text-slate-400">Ghi chú
                <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className="mt-1 h-20 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm font-semibold text-slate-700" />
              </label>
              <button onClick={addEntry} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0066cc] text-sm font-black text-white">
                <PlusCircle size={16} />
                Ghi nhận phiếu
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã phiếu, đối tượng, ghi chú..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#0066cc]" />
                </div>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
                  <option>Tất cả</option>
                  <option>Thu</option>
                  <option>Chi</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-black">Mã phiếu</th>
                    <th className="px-3 py-3 font-black">Loại</th>
                    <th className="px-3 py-3 font-black">Khoản mục</th>
                    <th className="px-3 py-3 font-black">Đối tượng</th>
                    <th className="px-3 py-3 font-black text-right">Số tiền</th>
                    <th className="px-3 py-3 font-black text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.code}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-black ${item.type === "Thu" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {item.type === "Thu" ? <HandCoins size={12} /> : <Banknote size={12} />}
                          {item.type}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{item.category}</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{item.partner}</td>
                      <td className="px-3 py-3 text-right font-black text-[#0066cc]">{item.amount.toLocaleString("vi-VN")} đ</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setNotice(`Đã mở chi tiết ${item.code}`)} className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-100 px-2 text-[11px] font-black text-slate-700">
                            <Wallet size={12} />
                            Chi tiết
                          </button>
                          <button onClick={() => removeEntry(item.id)} className="inline-flex h-8 items-center gap-1 rounded-md bg-rose-100 px-2 text-[11px] font-black text-rose-700">
                            Hủy phiếu
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
