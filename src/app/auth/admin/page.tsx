"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

type Branch = { id: string; name: string };

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white p-6 text-slate-900">Loading…</div>}>
      <AdminLoginInner />
    </Suspense>
  );
}

function AdminLoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search?.get("next") ?? "/admin";

  const [branches, setBranches] = useState<Branch[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/branches");
      const data = (await res.json()) as { branches: Branch[] };
      if (!alive) return;
      setBranches(data.branches);
      if (data.branches[0]) setBranchId(data.branches[0].id);
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, branchId: branchId || undefined }),
      });
      if (!res.ok) {
        setError("Sai email hoặc mật khẩu.");
        return;
      }
      router.push(nextPath);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">KrinnT POS</div>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">Admin sign in</h1>
          <p className="mt-1 text-sm text-slate-600">Đăng nhập để quản trị chi nhánh và vận hành.</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Branch</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error ? <div className="text-sm text-rose-600">{error}</div> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 text-xs text-slate-500">
            Chưa cấu hình admin? Vào seed hoặc tạo user qua database.
          </div>

          <div className="mt-4">
            <Link href="/" className="text-sm font-semibold text-slate-900 hover:underline">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

