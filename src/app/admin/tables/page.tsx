"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type Table = { id: string; name: string; qrToken: string; status: string };

export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [name, setName] = useState("");
  const [qrToken, setQrToken] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/admin/tables");
      const data = (await res.json()) as { tables: Table[] };
      if (!alive) return;
      setTables(data.tables ?? []);
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  async function create() {
    await fetch("/api/admin/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, qrToken }),
    });
    const res = await fetch("/api/admin/tables");
    const data = (await res.json()) as { tables: Table[] };
    setTables(data.tables ?? []);
    setName("");
    setQrToken("");
  }

  return (
    <AppShell title="Tables & QR" subtitle="Tạo bàn theo branch và gán QR token.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Create table</div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">QR token</label>
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={qrToken} onChange={(e) => setQrToken(e.target.value)} placeholder="T05" />
            </div>
            <button className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50" onClick={create} disabled={!name || !qrToken}>
              Create
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Tables</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-semibold">Name</th>
                  <th className="py-2 font-semibold">QR</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tables.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-900">{t.name}</td>
                    <td className="py-3 text-slate-700 font-mono">{t.qrToken}</td>
                    <td className="py-3 text-slate-700">{t.status}</td>
                  </tr>
                ))}
                {tables.length === 0 ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={3}>
                      No tables.
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

