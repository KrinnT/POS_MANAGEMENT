"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";

export default function FakePaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Đang tải cổng thanh toán...</div>}>
      <FakePaymentInner />
    </Suspense>
  );
}

function FakePaymentInner() {
  const search = useSearchParams();
  const paymentId = search?.get("paymentId");
  const provider = search?.get("provider") || "MOMO";
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePayment(isSuccess: boolean) {
    if (!paymentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          status: isSuccess ? "SUCCEEDED" : "FAILED",
          providerRef: `TXN_${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật trạng thái thanh toán.");
      setSuccess(isSuccess);
      setDone(true);
      setTimeout(() => router.push("/"), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const providerLabel = provider === "MOMO" ? "MoMo" : "VNPay";

  if (!paymentId) {
    return (
      <AppShell title="Payment Gateway" subtitle="Lỗi">
        <div className="max-w-md mx-auto mt-10 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 text-sm">
          Thiếu paymentId trong URL.
        </div>
      </AppShell>
    );
  }

  if (done) {
    return (
      <AppShell title="Kết quả thanh toán" subtitle={providerLabel}>
        <div className="max-w-md mx-auto mt-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          {success ? (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-emerald-700">Thanh toán thành công!</h2>
              <p className="text-sm text-slate-500 mt-2">Đang chuyển về trang chủ...</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-rose-700">Thanh toán thất bại</h2>
              <p className="text-sm text-slate-500 mt-2">Đang chuyển về trang chủ...</p>
            </>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Cổng thanh toán ${providerLabel}`} subtitle="Mô phỏng cổng thanh toán thực tế">
      <div className="max-w-md mx-auto mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
            {provider === "MOMO" ? "M" : "V"}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{providerLabel}</div>
            <div className="text-xs text-slate-500">Mã giao dịch: {paymentId.slice(0, 16)}…</div>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 border rounded-xl border-slate-200 bg-slate-50 p-3">
          Đây là cổng thanh toán <strong>giả lập</strong> cho mục đích demo. Vui lòng chọn kết quả giao dịch bên dưới.
        </p>

        {error && <div className="mb-4 text-sm text-rose-600 rounded-xl bg-rose-50 p-3">{error}</div>}

        <div className="space-y-3">
          <button
            onClick={() => handlePayment(true)}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
          >
            {loading ? "Đang xử lý..." : "✅ Xác nhận thanh toán thành công"}
          </button>
          <button
            onClick={() => handlePayment(false)}
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition"
          >
            {loading ? "Đang xử lý..." : "❌ Hủy giao dịch"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
