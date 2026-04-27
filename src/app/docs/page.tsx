"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function DocsPage() {
  return (
    <AppShell title="Docs" subtitle="Tài liệu PRD và kiến trúc hệ thống.">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-3 text-sm text-slate-700">
          <div>
            <div className="font-semibold text-slate-900">PRD</div>
            <div>File: <code className="rounded bg-slate-50 px-2 py-1">docs/PRD.md</code></div>
          </div>
          <div>
            <div className="font-semibold text-slate-900">Architecture</div>
            <div>File: <code className="rounded bg-slate-50 px-2 py-1">docs/ARCHITECTURE.md</code></div>
          </div>
          <div className="pt-2">
            <Link href="/" className="text-sm font-semibold text-slate-900 hover:underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

