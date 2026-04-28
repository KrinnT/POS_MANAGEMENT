"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import {
  LayoutDashboard,
  PackageSearch,
  Users,
  UtensilsCrossed,
  Building2,
  BarChart3,
  ShieldCheck,
  QrCode,
} from "lucide-react";

function SettingLink({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition"
    >
      <div className="mt-0.5 text-slate-500">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Quản lý cửa hàng, nhân viên, kho và báo cáo.">
      <div className="space-y-6">
        {/* Dashboard Metrics */}
        <DashboardMetrics />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SettingLink
            href="/admin"
            icon={<LayoutDashboard size={20} />}
            title="Dashboard"
            desc="Tổng quan vận hành, quản trị core modules."
          />
          <SettingLink
            href="/inventory"
            icon={<PackageSearch size={20} />}
            title="Inventory & Recipes"
            desc="Nguyên liệu, định mức, cảnh báo tồn kho thấp."
          />
          <SettingLink
            href="/staff"
            icon={<Users size={20} />}
            title="Staff & Roles"
            desc="Quản lý nhân viên, phân quyền, ca làm."
          />
          <SettingLink
            href="/admin/reports"
            icon={<BarChart3 size={20} />}
            title="Reports & Export"
            desc="Doanh thu, best sellers, xuất file CSV kế toán."
          />
          <SettingLink
            href="/admin/menu"
            icon={<UtensilsCrossed size={20} />}
            title="Menu Setup"
            desc="Sản phẩm, category, station, availability."
          />
          <SettingLink
            href="/admin/tables"
            icon={<QrCode size={20} />}
            title="Tables & QR"
            desc="Bàn theo branch, QR token, trạng thái."
          />
          <SettingLink
            href="/admin/branches"
            icon={<Building2 size={20} />}
            title="Branches"
            desc="Chi nhánh, thuế, phí dịch vụ, múi giờ."
          />
          <SettingLink
            href="/auth/admin"
            icon={<ShieldCheck size={20} />}
            title="Authentication"
            desc="Đăng nhập Admin để truy cập trang bảo mật."
          />
        </div>
      </div>
    </AppShell>
  );
}
