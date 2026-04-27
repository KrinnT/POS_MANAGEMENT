"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MonitorSmartphone, UtensilsCrossed, PackageSearch, Users, Settings } from "lucide-react";

function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      <span className={active ? "text-white" : "text-slate-600"}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3 xl:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-semibold">
                  K
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">KrinnT POS</div>
                  <div className="text-xs text-slate-500">F&B Operations Suite</div>
                </div>
              </div>

              <div className="mt-5 space-y-1">
                <NavLink href="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
                <NavLink href="/pos" icon={<MonitorSmartphone size={18} />} label="POS Terminal" />
                <NavLink href="/kds" icon={<UtensilsCrossed size={18} />} label="Kitchen Display" />
                <NavLink href="/inventory" icon={<PackageSearch size={18} />} label="Inventory" />
                <NavLink href="/staff" icon={<Users size={18} />} label="Staff" />
                <NavLink href="/settings" icon={<Settings size={18} />} label="Settings" />
              </div>
            </div>
          </aside>

          <main className="lg:col-span-9 xl:col-span-10">
            <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
                  {subtitle ? <p className="text-sm text-slate-600 mt-1">{subtitle}</p> : null}
                </div>
                {right ? <div className="shrink-0">{right}</div> : null}
              </div>
            </header>

            <div className="mt-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

