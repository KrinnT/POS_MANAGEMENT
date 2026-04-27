import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function Home() {
  return (
    <AppShell
      title="Dashboard"
      subtitle="Tổng quan vận hành theo thời gian thực."
      right={
        <div className="text-right">
          <div className="text-xs text-slate-500">Signed in as</div>
          <div className="text-sm font-semibold text-slate-900">Admin</div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
                <p className="text-sm text-slate-600 mt-1">Mở luồng demo QR → POS → KDS.</p>
              </div>
              <Link
                href="/order/T01"
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Open QR (T01)
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/pos"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Open POS
              </Link>
              <Link
                href="/kds"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Open KDS
              </Link>
              <Link
                href="/inventory"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Inventory
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard title="Revenue (Today)" value="—" hint="Realtime (phase next)" />
            <MetricCard title="Orders" value="—" hint="Realtime (phase next)" />
            <MetricCard title="Active tables" value="—" hint="Realtime (phase next)" />
            <MetricCard title="Avg. ticket time" value="—" hint="SLA (phase next)" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">What’s implemented</h2>
              <Link href="/docs" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
                Docs
              </Link>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>QR ordering demo + realtime trạng thái order</li>
              <li>POS send order → KDS theo trạm HOT/COLD/BAR</li>
              <li>Inventory trừ theo recipe (MVP) + low-stock alert</li>
              <li>Build/lint pass; Prisma v7 dùng adapter pg</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Next steps (production)</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Auth/RBAC + audit log</li>
              <li>Split bill + payment gateway + webhook + idempotency</li>
              <li>Offline-first sync cho POS</li>
              <li>Reporting realtime + export chuẩn kế toán</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900 tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
