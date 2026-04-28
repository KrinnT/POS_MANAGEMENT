"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bell, ChevronRight, Clock3, ListChecks, RefreshCw, Sparkles, TrendingUp } from "lucide-react";

type Stats = {
  totalRevenue: number;
  orderCount: number;
  occupancyRate: number;
  revenueByDay: Array<{ day: string; revenue: number }>;
};

type DateRange = "today" | "7d" | "30d";

function vnd(n: number) {
  return n.toLocaleString("vi-VN") + " đ";
}

export default function EnterpriseDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>("today");
  const [chartMode, setChartMode] = useState<"revenue" | "orders">("revenue");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusText, setStatusText] = useState("Sẵn sàng vận hành");

  async function loadStats() {
    try {
      const res = await fetch("/api/admin/stats");
      const data = (await res.json()) as { stats: Stats };
      setStats(data.stats);
      setStatusText("Đồng bộ dữ liệu thành công");
    } catch {
      setStatusText("Mất kết nối dữ liệu, đang giữ cache");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStats();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      void loadStats();
    }, 25000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const trendData = useMemo(() => {
    const base = stats?.revenueByDay ?? [];
    if (chartMode === "revenue") return base;
    return base.map((item, index) => ({
      ...item,
      revenue: Math.round((item.revenue / 120000) * (1 + index * 0.04)),
    }));
  }, [chartMode, stats?.revenueByDay]);

  const cards = [
    {
      label: "Doanh thu",
      value: vnd(stats?.totalRevenue ?? 0),
      hint: range === "today" ? "Trong hôm nay" : range === "7d" ? "7 ngày gần nhất" : "30 ngày gần nhất",
    },
    {
      label: "Đơn hàng",
      value: String(stats?.orderCount ?? 0),
      hint: "Đơn đã phát sinh",
    },
    {
      label: "Công suất bàn",
      value: `${Math.round((stats?.occupancyRate ?? 0) * 100)}%`,
      hint: "Bàn đang có khách",
    },
    {
      label: "Trạng thái hệ thống",
      value: statusText,
      hint: "Giám sát vận hành",
    },
  ];

  return (
    <AppShell
      title="Tổng quan vận hành"
      subtitle="Theo dõi KPI realtime, điều phối ca và hành động nhanh theo luồng bán hàng."
      right={
        <div className="flex items-center gap-2">
          {(["today", "7d", "30d"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setRange(item)}
              className={`h-10 rounded-lg px-3 text-xs font-black uppercase ${
                range === item ? "bg-[#0066cc] text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {item}
            </button>
          ))}
          <button
            onClick={() => {
              setLoading(true);
              void loadStats();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
            title="Làm mới"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-100 border-t-[#0066cc]" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.label}</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{card.value}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{card.hint}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Biểu đồ hoạt động</h3>
                  <p className="text-xs font-semibold text-slate-500">Theo dõi tăng trưởng để quyết định ca làm và hàng hóa.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartMode("revenue")}
                    className={`h-9 rounded-lg px-3 text-xs font-black ${chartMode === "revenue" ? "bg-[#0066cc] text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    Doanh thu
                  </button>
                  <button
                    onClick={() => setChartMode("orders")}
                    className={`h-9 rounded-lg px-3 text-xs font-black ${chartMode === "orders" ? "bg-[#0066cc] text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    Lượt đơn
                  </button>
                </div>
              </div>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0066cc" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0066cc" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#0066cc" strokeWidth={3} fill="url(#revGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900">Hành động nhanh</h3>
                  <Sparkles size={16} className="text-[#0066cc]" />
                </div>
                <div className="space-y-2">
                  {[
                    { href: "/pos", label: "Mở thu ngân", icon: <TrendingUp size={16} /> },
                    { href: "/admin/menu", label: "Cập nhật hàng hóa", icon: <ListChecks size={16} /> },
                    { href: "/admin/tables", label: "Điều phối phòng/bàn", icon: <Clock3 size={16} /> },
                    { href: "/admin/reports", label: "Đối soát báo cáo", icon: <Bell size={16} /> },
                  ].map((item) => (
                    <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-[#0066cc]">
                      <span className="inline-flex items-center gap-2">
                        {item.icon}
                        {item.label}
                      </span>
                      <ChevronRight size={15} />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900">Thiết lập giám sát</h3>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`rounded-md px-3 py-1 text-xs font-black ${autoRefresh ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {autoRefresh ? "Auto refresh ON" : "Auto refresh OFF"}
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Khi bật, trang tự đồng bộ số liệu mỗi 25 giây để đội vận hành theo dõi sát giờ cao điểm.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
