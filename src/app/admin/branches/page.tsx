"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type Branch = {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
  currency: string;
  taxRate: number;
  serviceChargeRate: number;
};

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [serviceChargeRate, setServiceChargeRate] = useState("0");

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/admin/branches");
      const data = (await res.json()) as { branches: Branch[] };
      if (!alive) return;
      setBranches(data.branches);
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  async function createBranch() {
    await fetch("/api/admin/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        taxRate: Number(taxRate),
        serviceChargeRate: Number(serviceChargeRate),
      }),
    });
    setName("");

    const res = await fetch("/api/admin/branches");
    const data = (await res.json()) as { branches: Branch[] };
    setBranches(data.branches);
  }

  return (
    <AppShell title="Branches" subtitle="Quản lý chi nhánh và cấu hình pricing/payment.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Create branch</div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tax rate</label>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Service</label>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={serviceChargeRate} onChange={(e) => setServiceChargeRate(e.target.value)} />
              </div>
            </div>
            <button onClick={createBranch} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" disabled={!name}>
              Create
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">All branches</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-semibold">Name</th>
                  <th className="py-2 font-semibold">Tax</th>
                  <th className="py-2 font-semibold">Service</th>
                  <th className="py-2 font-semibold">Currency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-900">{b.name}</td>
                    <td className="py-3 text-slate-700">{b.taxRate}</td>
                    <td className="py-3 text-slate-700">{b.serviceChargeRate}</td>
                    <td className="py-3 text-slate-700">{b.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

