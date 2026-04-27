"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  station: "HOT" | "COLD" | "BAR";
  isAvailable: boolean;
};

export default function AdminMenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState("Food");
  const [station, setStation] = useState<Product["station"]>("HOT");

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/admin/products");
      const data = (await res.json()) as { products: Product[] };
      if (!alive) return;
      setProducts(data.products ?? []);
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  async function create() {
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Number(price), category, station }),
    });
    const res = await fetch("/api/admin/products");
    const data = (await res.json()) as { products: Product[] };
    setProducts(data.products ?? []);
    setName("");
  }

  return (
    <AppShell title="Menu" subtitle="Quản lý sản phẩm theo chi nhánh.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Create product</div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Price</label>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Station</label>
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={station} onChange={(e) => setStation(e.target.value as Product["station"])}>
                  <option value="HOT">HOT</option>
                  <option value="COLD">COLD</option>
                  <option value="BAR">BAR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Category</label>
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <button className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50" onClick={create} disabled={!name}>
              Create
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Products</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-semibold">Name</th>
                  <th className="py-2 font-semibold">Category</th>
                  <th className="py-2 font-semibold">Station</th>
                  <th className="py-2 font-semibold">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-900">{p.name}</td>
                    <td className="py-3 text-slate-700">{p.category}</td>
                    <td className="py-3 text-slate-700">{p.station}</td>
                    <td className="py-3 text-slate-700">{p.price.toFixed(0)}</td>
                  </tr>
                ))}
                {products.length === 0 ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={4}>
                      No products.
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

