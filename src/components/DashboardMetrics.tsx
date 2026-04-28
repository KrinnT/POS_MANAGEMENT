"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socketClient";

type DashboardData = {
  revenueToday: number;
  ordersCount: number;
  activeTables: number;
  avgTicketTime: number; // in minutes
};

type DashboardError = {
  error: string;
};

function MetricCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900 tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function DashboardMetrics() {
  const [data, setData] = useState<DashboardData | DashboardError | null>(null);

  useEffect(() => {
    let alive = true;
    async function loadMetrics() {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        if (alive) setData(json);
      } catch (err) {
        console.error("Failed to load dashboard metrics", err);
      }
    }
    
    void loadMetrics();

    async function setupSocket() {
      const socket = await getSocket();
      socket.on("order:created", loadMetrics);
      socket.on("order:updated", loadMetrics);
      socket.on("payment:updated", loadMetrics);
    }
    
    void setupSocket();

    return () => {
      alive = false;
      getSocket().then((socket) => {
        socket.off("order:created", loadMetrics);
        socket.off("order:updated", loadMetrics);
        socket.off("payment:updated", loadMetrics);
      });
    };
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
        <MetricCard title="Revenue (Today)" value="—" hint="Loading..." />
        <MetricCard title="Orders" value="—" hint="Loading..." />
        <MetricCard title="Active tables" value="—" hint="Loading..." />
        <MetricCard title="Avg. ticket time" value="—" hint="Loading..." />
      </div>
    );
  }

  if ('error' in data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm shadow-sm">
        Failed to load metrics: {data.error}. Please check database connection.
      </div>
    );
  }

  const formatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <MetricCard title="Revenue (Today)" value={formatter.format(data.revenueToday)} hint="Realtime" />
      <MetricCard title="Orders" value={(data.ordersCount ?? 0).toString()} hint="Realtime" />
      <MetricCard title="Active tables" value={(data.activeTables ?? 0).toString()} hint="Realtime" />
      <MetricCard title="Avg. ticket time" value={`${data.avgTicketTime ?? 0} min`} hint="SLA" />
    </div>
  );
}
