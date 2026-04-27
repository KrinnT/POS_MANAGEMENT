"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Cấu hình cửa hàng, thuế, thiết bị, payment, KDS station.">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="text-sm text-slate-700">
          Phase tiếp theo: cấu hình payment provider (Momo/VNPay), bảng giá theo chi nhánh, thuế/phí dịch vụ, cấu hình KDS station.
        </div>
        <div className="pt-1">
          <Link href="/docs" className="text-sm font-semibold text-slate-900 hover:underline">
            Xem PRD/Architecture
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

