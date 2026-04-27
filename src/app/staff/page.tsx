"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function StaffPage() {
  return (
    <AppShell title="Staff" subtitle="Phân quyền, ca làm, chấm công và hoa hồng.">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-slate-700">
          Phase tiếp theo: RBAC theo role (ADMIN/MANAGER/CASHIER/WAITER/CHEF), ca làm (shift), chấm công và hoa hồng.
        </div>
        <div className="mt-4">
          <Link href="/docs" className="text-sm font-semibold text-slate-900 hover:underline">
            Xem PRD/Architecture
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

