"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

type Inventory = {
  id: string;
  ingredient: string;
  stockQuantity: number;
  unit: string;
  minThreshold: number;
};

export default function InventoryPage() {
  const [items, setItems] = useState<Inventory[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/inventory");
      const { items } = (await res.json()) as { items: Inventory[] };
      if (!alive) return;
      setItems(items);
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const lowStock = useMemo(() => items.filter((i) => i.stockQuantity <= i.minThreshold), [items]);

  return (
    <AppShell title="Inventory" subtitle="Trừ kho theo recipe (MVP) và cảnh báo ngưỡng tối thiểu.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Low stock</h2>
            <span className="text-xs text-slate-500">{lowStock.length} items</span>
          </div>
          <div className="mt-3 space-y-2">
            {lowStock.length === 0 ? (
              <div className="text-sm text-slate-600">Không có nguyên liệu chạm ngưỡng.</div>
            ) : (
              lowStock.map((i) => (
                <div key={i.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="font-semibold text-slate-900">{i.ingredient}</div>
                  <div className="text-xs text-amber-700 mt-1">
                    {i.stockQuantity} {i.unit} (min {i.minThreshold})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">All ingredients</h2>
            <Link href="/docs" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
              Docs
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wide">
                  <th className="py-2 font-semibold">Ingredient</th>
                  <th className="py-2 font-semibold">Stock</th>
                  <th className="py-2 font-semibold">Min</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-900">{i.ingredient}</td>
                    <td className="py-3 text-slate-700">
                      {i.stockQuantity} {i.unit}
                    </td>
                    <td className="py-3 text-slate-600">{i.minThreshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

