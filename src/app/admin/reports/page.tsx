"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type Summary = {
  revenue: number;
  orders: number;
  paidOrders: number;
  topItems: Array<{ name: string; qty: number; amount: number }>;
};

export default function AdminReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/admin/reports/summary");
      const data = (await res.json()) as { summary: Summary };
      if (!alive) return;
      setSummary(data.summary);
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AppShell title="Reports" subtitle="Báo cáo cơ bản: doanh thu, đơn hàng, best sellers, reconciliation.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Revenue</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary ? summary.revenue.toFixed(0) : "—"}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Orders</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary ? summary.orders : "—"}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Paid orders</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary ? summary.paidOrders : "—"}</div>
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Top items</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-semibold">Item</th>
                  <th className="py-2 font-semibold">Qty</th>
                  <th className="py-2 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(summary?.topItems ?? []).map((i) => (
                  <tr key={i.name} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-900">{i.name}</td>
                    <td className="py-3 text-slate-700">{i.qty}</td>
                    <td className="py-3 text-slate-700">{i.amount.toFixed(0)}</td>
                  </tr>
                ))}
                {(summary?.topItems?.length ?? 0) === 0 ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={3}>
                      No data.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

