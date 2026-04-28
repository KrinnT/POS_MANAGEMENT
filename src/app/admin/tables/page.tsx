"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Pencil, QrCode, RefreshCw, Search, Trash2, Users } from "lucide-react";

type Table = { id: string; name: string; qrToken: string; status: "AVAILABLE" | "OCCUPIED" };
type Group = "Tầng 1" | "Tầng 2" | "VIP";

type LocalTable = Table & { group: Group; capacity: number; note: string };

export default function AdminTablesPage() {
  const [tables, setTables] = useState<LocalTable[]>([]);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"Tất cả" | Group>("Tất cả");
  const [statusFilter, setStatusFilter] = useState<"Tất cả" | "AVAILABLE" | "OCCUPIED">("Tất cả");
  const [editing, setEditing] = useState<LocalTable | null>(null);
  const [draft, setDraft] = useState({ name: "", qrToken: "", group: "Tầng 1" as Group, capacity: 4, note: "" });
  const [notice, setNotice] = useState("Sẵn sàng điều phối phòng/bàn");

  async function load() {
    const res = await fetch("/api/admin/tables");
    const data = (await res.json()) as { tables: Table[] };
    const mapped = (data.tables ?? []).map((item, index) => ({
      ...item,
      group: (["Tầng 1", "Tầng 2", "VIP"] as const)[index % 3],
      capacity: 2 + (index % 6),
      note: "",
    }));
    setTables(mapped);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tables.filter((table) => {
      const byText = !q || `${table.name} ${table.qrToken}`.toLowerCase().includes(q);
      const byGroup = groupFilter === "Tất cả" || table.group === groupFilter;
      const byStatus = statusFilter === "Tất cả" || table.status === statusFilter;
      return byText && byGroup && byStatus;
    });
  }, [groupFilter, search, statusFilter, tables]);

  async function createTable() {
    await fetch("/api/admin/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draft.name, qrToken: draft.qrToken }),
    });
    await load();
    setDraft({ name: "", qrToken: "", group: "Tầng 1", capacity: 4, note: "" });
    setNotice("Đã tạo bàn mới thành công");
  }

  function removeTable(id: string) {
    setTables((current) => current.filter((item) => item.id !== id));
    setNotice("Đã xóa bàn khỏi danh sách điều phối");
  }

  function updateTable(next: LocalTable) {
    setTables((current) => current.map((item) => (item.id === next.id ? next : item)));
    setEditing(null);
    setNotice(`Đã cập nhật ${next.name}`);
  }

  function toggleStatus(id: string) {
    setTables((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: item.status === "AVAILABLE" ? "OCCUPIED" : "AVAILABLE" } : item,
      ),
    );
  }

  const summary = {
    all: filtered.length,
    available: filtered.filter((item) => item.status === "AVAILABLE").length,
    occupied: filtered.filter((item) => item.status === "OCCUPIED").length,
  };

  return (
    <AppShell
      title="Phòng/Bàn"
      subtitle="Điều phối bàn theo khu vực, trạng thái phục vụ, QR và sức chứa."
      right={
        <button onClick={() => void load()} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
          <RefreshCw size={16} />
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Tổng bàn</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{summary.all}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Bàn trống</div>
            <div className="mt-2 text-3xl font-black text-emerald-600">{summary.available}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Bàn có khách</div>
            <div className="mt-2 text-3xl font-black text-amber-600">{summary.occupied}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Thông báo</div>
            <div className="mt-2 text-sm font-bold text-[#0066cc]">{notice}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-black text-slate-900">Tạo phòng/bàn mới</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400">Tên bàn
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400">QR token
                <input value={draft.qrToken} onChange={(e) => setDraft({ ...draft, qrToken: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" placeholder="T05" />
              </label>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400">Khu vực
                <select value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value as Group })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900">
                  {["Tầng 1", "Tầng 2", "VIP"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400">Sức chứa
                <input type="number" value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
              <button onClick={createTable} disabled={!draft.name || !draft.qrToken} className="h-11 w-full rounded-lg bg-[#0066cc] text-sm font-black text-white disabled:opacity-40">
                Tạo bàn
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm bàn, QR..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#0066cc]" />
                </div>
                <div className="flex gap-2">
                  <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value as typeof groupFilter)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
                    {["Tất cả", "Tầng 1", "Tầng 2", "VIP"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
                    <option>Tất cả</option>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="OCCUPIED">OCCUPIED</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((table) => (
                <div key={table.id} className={`rounded-lg border p-3 ${table.status === "OCCUPIED" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-black text-slate-900">{table.name}</div>
                    <button onClick={() => toggleStatus(table.id)} className={`rounded px-2 py-1 text-[10px] font-black ${table.status === "OCCUPIED" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {table.status}
                    </button>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                    <QrCode size={13} />
                    {table.qrToken}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Users size={13} />
                    {table.capacity} khách · {table.group}
                  </div>
                  <div className="mt-3 flex justify-end gap-1">
                    <button onClick={() => setEditing(table)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600"><Pencil size={13} /></button>
                    <button onClick={() => removeTable(table.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-rose-600"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-black text-slate-900">Cập nhật bàn</h3>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              <label className="text-xs font-black uppercase text-slate-500">Tên bàn
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
              <label className="text-xs font-black uppercase text-slate-500">QR token
                <input value={editing.qrToken} onChange={(e) => setEditing({ ...editing, qrToken: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
              <label className="text-xs font-black uppercase text-slate-500">Khu vực
                <select value={editing.group} onChange={(e) => setEditing({ ...editing, group: e.target.value as Group })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900">
                  {["Tầng 1", "Tầng 2", "VIP"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-xs font-black uppercase text-slate-500">Sức chứa
                <input type="number" value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button onClick={() => setEditing(null)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600">Hủy</button>
              <button onClick={() => updateTable(editing)} className="h-10 rounded-lg bg-[#0066cc] px-4 text-sm font-bold text-white">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
