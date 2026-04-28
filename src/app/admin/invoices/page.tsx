"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Calculator, FileDigit, PercentCircle, ReceiptText, Search, Wallet } from "lucide-react";

type Invoice = {
  id: string;
  code: string;
  customer: string;
  channel: "Tại quán" | "Mang đi" | "Giao hàng";
  total: number;
  net: number;
  tax: number;
  status: "Đã thanh toán" | "Chưa thanh toán" | "Đã hủy";
  createdDate: string;
};

type Ledger = {
  id: string;
  doc: string;
  debit: string;
  credit: string;
  amount: number;
  note: string;
};

const demoInvoices: Invoice[] = [
  { id: "1", code: "HD000124", customer: "Khách lẻ", channel: "Tại quán", total: 235000, net: 217593, tax: 17407, status: "Đã thanh toán", createdDate: "2026-04-29" },
  { id: "2", code: "HD000125", customer: "Nguyễn Minh Anh", channel: "Giao hàng", total: 480000, net: 444444, tax: 35556, status: "Chưa thanh toán", createdDate: "2026-04-29" },
  { id: "3", code: "HD000126", customer: "Công ty Sao Mai", channel: "Mang đi", total: 860000, net: 796296, tax: 63704, status: "Đã thanh toán", createdDate: "2026-04-28" },
];

const taxProfiles = [
  { code: "VAT8", name: "Thuế GTGT 8%", rate: 8, applied: 120, revenue: 32_500_000 },
  { code: "VAT10", name: "Thuế GTGT 10%", rate: 10, applied: 14, revenue: 5_400_000 },
  { code: "EXEMPT", name: "Không chịu thuế", rate: 0, applied: 8, revenue: 420_000 },
];

const ledgerDemo: Ledger[] = [
  { id: "1", doc: "HD000124", debit: "1111", credit: "5111", amount: 217593, note: "Ghi nhận doanh thu thuần" },
  { id: "2", doc: "HD000124", debit: "1111", credit: "33311", amount: 17407, note: "Ghi nhận thuế GTGT đầu ra" },
  { id: "3", doc: "HD000125", debit: "1311", credit: "5111", amount: 444444, note: "Công nợ phải thu khách hàng" },
];

export default function InvoicesPage() {
  const [tab, setTab] = useState<"transactions" | "tax" | "ledger">("transactions");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Tất cả" | Invoice["status"]>("Tất cả");
  const [invoices, setInvoices] = useState<Invoice[]>(demoInvoices);
  const [ledger, setLedger] = useState<Ledger[]>(ledgerDemo);
  const [notice, setNotice] = useState("Sẵn sàng đối soát giao dịch");

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((item) => {
      const bySearch = !q || `${item.code} ${item.customer}`.toLowerCase().includes(q);
      const byStatus = statusFilter === "Tất cả" || item.status === statusFilter;
      return bySearch && byStatus;
    });
  }, [invoices, search, statusFilter]);

  const taxSummary = useMemo(() => filteredInvoices.reduce((sum, item) => sum + item.tax, 0), [filteredInvoices]);
  const receivable = useMemo(() => filteredInvoices.filter((item) => item.status === "Chưa thanh toán").reduce((sum, item) => sum + item.total, 0), [filteredInvoices]);

  function markPaid(id: string) {
    setInvoices((current) => current.map((item) => (item.id === id ? { ...item, status: "Đã thanh toán" } : item)));
    setNotice(`Đã xác nhận thu tiền cho ${id}`);
  }

  function cancelInvoice(id: string) {
    setInvoices((current) => current.map((item) => (item.id === id ? { ...item, status: "Đã hủy" } : item)));
    setNotice(`Đã hủy hóa đơn ${id}`);
  }

  function postLedger(id: string) {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) return;
    setLedger((current) => [
      {
        id: crypto.randomUUID(),
        doc: invoice.code,
        debit: invoice.status === "Đã thanh toán" ? "1111" : "1311",
        credit: "5111",
        amount: invoice.net,
        note: "Bút toán doanh thu bổ sung",
      },
      ...current,
    ]);
    setNotice(`Đã hạch toán bổ sung cho ${invoice.code}`);
  }

  return (
    <AppShell title="Giao dịch, Thuế và Kế toán" subtitle="Kiểm soát vòng đời hóa đơn: phát sinh - thuế - hạch toán - đối soát công nợ.">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Tổng giao dịch</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{filteredInvoices.length}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Thuế đầu ra</div>
            <div className="mt-2 text-3xl font-black text-[#0066cc]">{taxSummary.toLocaleString("vi-VN")} đ</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Công nợ phải thu</div>
            <div className="mt-2 text-3xl font-black text-amber-600">{receivable.toLocaleString("vi-VN")} đ</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Trạng thái xử lý</div>
            <div className="mt-2 text-sm font-bold text-[#0066cc]">{notice}</div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTab("transactions")} className={`h-9 rounded-lg px-3 text-xs font-black ${tab === "transactions" ? "bg-[#0066cc] text-white" : "bg-slate-100 text-slate-600"}`}>
              <span className="inline-flex items-center gap-2"><ReceiptText size={14} /> Giao dịch</span>
            </button>
            <button onClick={() => setTab("tax")} className={`h-9 rounded-lg px-3 text-xs font-black ${tab === "tax" ? "bg-[#0066cc] text-white" : "bg-slate-100 text-slate-600"}`}>
              <span className="inline-flex items-center gap-2"><PercentCircle size={14} /> Thuế</span>
            </button>
            <button onClick={() => setTab("ledger")} className={`h-9 rounded-lg px-3 text-xs font-black ${tab === "ledger" ? "bg-[#0066cc] text-white" : "bg-slate-100 text-slate-600"}`}>
              <span className="inline-flex items-center gap-2"><FileDigit size={14} /> Kế toán</span>
            </button>
          </div>
        </div>

        {tab === "transactions" && (
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã hóa đơn, khách hàng..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#0066cc]" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
                  {["Tất cả", "Đã thanh toán", "Chưa thanh toán", "Đã hủy"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-black">Mã</th>
                    <th className="px-3 py-3 font-black">Khách hàng</th>
                    <th className="px-3 py-3 font-black">Kênh</th>
                    <th className="px-3 py-3 font-black text-right">Giá trị</th>
                    <th className="px-3 py-3 font-black text-right">Thuế</th>
                    <th className="px-3 py-3 font-black">Trạng thái</th>
                    <th className="px-3 py-3 font-black text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/40">
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.code}</td>
                      <td className="px-3 py-3 font-bold text-slate-900">{item.customer}</td>
                      <td className="px-3 py-3 text-slate-600">{item.channel}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900">{item.total.toLocaleString("vi-VN")} đ</td>
                      <td className="px-3 py-3 text-right font-semibold text-[#0066cc]">{item.tax.toLocaleString("vi-VN")} đ</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-md px-2 py-1 text-xs font-black ${
                          item.status === "Đã thanh toán" ? "bg-emerald-100 text-emerald-700" : item.status === "Chưa thanh toán" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => markPaid(item.id)} className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-100 px-2 text-[11px] font-black text-emerald-700">
                            <Wallet size={12} />
                            Thu tiền
                          </button>
                          <button onClick={() => postLedger(item.id)} className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-100 px-2 text-[11px] font-black text-[#0066cc]">
                            <Calculator size={12} />
                            Hạch toán
                          </button>
                          <button onClick={() => cancelInvoice(item.id)} className="inline-flex h-8 items-center gap-1 rounded-md bg-rose-100 px-2 text-[11px] font-black text-rose-700">
                            Hủy
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "tax" && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-base font-black text-slate-900">Cấu hình & đối soát thuế</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {taxProfiles.map((item) => (
                <div key={item.code} className="rounded-lg border border-slate-200 p-4">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-400">{item.code}</div>
                  <div className="mt-1 text-sm font-black text-slate-900">{item.name}</div>
                  <div className="mt-2 text-xl font-black text-[#0066cc]">{item.rate}%</div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">{item.applied} hóa đơn · {item.revenue.toLocaleString("vi-VN")} đ</div>
                  <button onClick={() => setNotice(`Đã mở cấu hình thuế ${item.code}`)} className="mt-3 h-8 rounded-md bg-slate-100 px-3 text-xs font-black text-slate-700">
                    Chỉnh cấu hình
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "ledger" && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-base font-black text-slate-900">Bút toán kế toán phát sinh từ giao dịch</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-black">Chứng từ</th>
                    <th className="px-3 py-3 font-black">Nợ</th>
                    <th className="px-3 py-3 font-black">Có</th>
                    <th className="px-3 py-3 font-black text-right">Số tiền</th>
                    <th className="px-3 py-3 font-black">Diễn giải</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.doc}</td>
                      <td className="px-3 py-3 font-bold text-slate-900">{item.debit}</td>
                      <td className="px-3 py-3 font-bold text-slate-900">{item.credit}</td>
                      <td className="px-3 py-3 text-right font-black text-[#0066cc]">{item.amount.toLocaleString("vi-VN")} đ</td>
                      <td className="px-3 py-3 text-slate-600">{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
