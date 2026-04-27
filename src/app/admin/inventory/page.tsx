"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type Inventory = { id: string; ingredient: string; stockQuantity: number; unit: string; minThreshold: number };

export default function AdminInventoryPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [ingredient, setIngredient] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [unit, setUnit] = useState("g");
  const [minThreshold, setMinThreshold] = useState("0");

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/admin/inventory");
      const data = (await res.json()) as { items: Inventory[] };
      if (!alive) return;
      setItems(data.items ?? []);
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  async function create() {
    await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredient, stockQuantity: Number(stockQuantity), unit, minThreshold: Number(minThreshold) }),
    });
    const res = await fetch("/api/admin/inventory");
    const data = (await res.json()) as { items: Inventory[] };
    setItems(data.items ?? []);
    setIngredient("");
  }

  return (
    <AppShell title="Inventory & Recipes" subtitle="Nguyên liệu theo branch, quản lý tồn và ngưỡng tối thiểu.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Create ingredient</div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Ingredient</label>
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={ingredient} onChange={(e) => setIngredient(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Stock</label>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Unit</label>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Min threshold</label>
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)} />
            </div>
            <button className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50" onClick={create} disabled={!ingredient}>
              Create
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Ingredients</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
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
                    <td className="py-3 text-slate-700">{i.minThreshold}</td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={3}>
                      No inventory items.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

