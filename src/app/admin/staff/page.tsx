"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type Staff = { id: string; phone: string; email: string | null; role: string; branchId: string | null };

export default function AdminStaffPage() {
  const [users, setUsers] = useState<Staff[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("WAITER");
  const [pin, setPin] = useState("1234");

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/admin/staff");
      const data = (await res.json()) as { users: Staff[] };
      if (!alive) return;
      setUsers(data.users ?? []);
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  async function create() {
    await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, email: email || null, role, pin }),
    });
    const res = await fetch("/api/admin/staff");
    const data = (await res.json()) as { users: Staff[] };
    setUsers(data.users ?? []);
    setPhone("");
    setEmail("");
  }

  return (
    <AppShell title="Staff & Roles" subtitle="Tạo staff, gán role, reset PIN/password (MVP).">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Create staff</div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone</label>
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email (optional)</label>
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Role</label>
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="CASHIER">CASHIER</option>
                  <option value="WAITER">WAITER</option>
                  <option value="CHEF">CHEF</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">POS PIN</label>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={pin} onChange={(e) => setPin(e.target.value)} />
              </div>
            </div>
            <button className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50" onClick={create} disabled={!phone}>
              Create
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Staff</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-semibold">Phone</th>
                  <th className="py-2 font-semibold">Email</th>
                  <th className="py-2 font-semibold">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-900">{u.phone}</td>
                    <td className="py-3 text-slate-700">{u.email ?? "—"}</td>
                    <td className="py-3 text-slate-700">{u.role}</td>
                  </tr>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={3}>
                      No staff.
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

