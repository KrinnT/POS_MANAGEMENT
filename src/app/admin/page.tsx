"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

type Branch = { id: string; name: string; currency: string; timezone: string };
type User = { id: string; phone: string; email: string | null; role: string; branchId: string | null };

export default function AdminHomePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [me, setMe] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [bRes, meRes] = await Promise.all([fetch("/api/branches"), fetch("/api/auth/me")]);
      const b = (await bRes.json()) as { branches: Branch[] };
      const m = (await meRes.json()) as { user: User | null };
      if (!alive) return;
      setBranches(b.branches);
      setMe(m.user);
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const activeBranch = useMemo(() => branches.find((b) => b.id === me?.branchId) ?? null, [branches, me]);

  return (
    <AppShell
      title="Admin Dashboard"
      subtitle={activeBranch ? `Branch: ${activeBranch.name}` : "Chọn branch khi đăng nhập"}
      right={
        <div className="flex items-center gap-2">
          <Link href="/admin/settings" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
            Settings
          </Link>
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              location.href = "/";
            }}
          >
            Logout
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Core modules</div>
          <div className="mt-3 space-y-2">
            <AdminLink href="/admin/branches" title="Branches" desc="Quản lý chi nhánh, tax/service charge, payment methods." />
            <AdminLink href="/admin/menu" title="Menu" desc="Sản phẩm, category, station, availability." />
            <AdminLink href="/admin/tables" title="Tables & QR" desc="Bàn theo branch, QR token, trạng thái." />
            <AdminLink href="/admin/inventory" title="Inventory & Recipes" desc="Nguyên liệu, định mức, low stock." />
            <AdminLink href="/admin/staff" title="Staff & Roles" desc="User, role, gán branch, reset PIN/password." />
            <AdminLink href="/admin/reports" title="Reports" desc="Doanh thu, best sellers, payment reconciliation, export CSV." />
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Environment</div>
            <Link href="/docs" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
              Docs
            </Link>
          </div>
          <div className="mt-3 text-sm text-slate-700 space-y-2">
            <div>
              <span className="font-semibold text-slate-900">Signed in:</span> {me ? `${me.email ?? me.phone} (${me.role})` : "—"}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Branch:</span> {activeBranch ? `${activeBranch.name} · ${activeBranch.currency}` : "—"}
            </div>
            <div className="pt-2 text-xs text-slate-500">
              Lưu ý: để chạy runtime DB với Prisma v7 adapter, hãy set <code className="rounded bg-slate-50 px-1.5 py-0.5">PG_DATABASE_URL</code>.
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function AdminLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="text-sm text-slate-600 mt-1">{desc}</div>
    </Link>
  );
}

