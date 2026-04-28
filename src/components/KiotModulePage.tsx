"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Filter,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

type FieldType = "text" | "number" | "select" | "date";

type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
};

type ModuleConfig = {
  title: string;
  subtitle: string;
  storageKey: string;
  primary: string;
  searchKeys: string[];
  statusKey?: string;
  statusOptions?: string[];
  fields: Field[];
  seed: Record<string, string | number>[];
};

const MODULES: Record<string, ModuleConfig> = {
  customers: {
    title: "Khách hàng",
    subtitle: "Quản lý hồ sơ, nhóm khách, điểm tích lũy và công nợ",
    storageKey: "kiot-customers",
    primary: "name",
    searchKeys: ["code", "name", "phone", "group"],
    statusKey: "status",
    statusOptions: ["Đang phục vụ", "Tạm ngừng"],
    fields: [
      { key: "code", label: "Mã khách", type: "text", required: true },
      { key: "name", label: "Tên khách", type: "text", required: true },
      { key: "phone", label: "Số điện thoại", type: "text" },
      { key: "group", label: "Nhóm khách", type: "select", options: ["Thường", "VIP", "Đối tác"] },
      { key: "points", label: "Điểm", type: "number" },
      { key: "debt", label: "Công nợ", type: "number" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Đang phục vụ", "Tạm ngừng"] },
    ],
    seed: [
      { code: "KH001", name: "Nguyễn Minh Anh", phone: "0901000001", group: "VIP", points: 240, debt: 0, status: "Đang phục vụ" },
      { code: "KH002", name: "Công ty Sự kiện Sao Mai", phone: "0901000002", group: "Đối tác", points: 1200, debt: 1850000, status: "Đang phục vụ" },
    ],
  },
  invoices: {
    title: "Hóa đơn",
    subtitle: "Tra cứu hóa đơn, trạng thái thanh toán, kênh bán và hoàn/hủy",
    storageKey: "kiot-invoices",
    primary: "code",
    searchKeys: ["code", "customer", "channel", "cashier"],
    statusKey: "status",
    statusOptions: ["Đã thanh toán", "Chưa thanh toán", "Đã hủy"],
    fields: [
      { key: "code", label: "Mã hóa đơn", type: "text", required: true },
      { key: "customer", label: "Khách hàng", type: "text" },
      { key: "channel", label: "Kênh bán", type: "select", options: ["Tại quán", "Mang đi", "Giao hàng", "Online"] },
      { key: "cashier", label: "Thu ngân", type: "text" },
      { key: "total", label: "Tổng tiền", type: "number" },
      { key: "createdDate", label: "Ngày bán", type: "date" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Đã thanh toán", "Chưa thanh toán", "Đã hủy"] },
    ],
    seed: [
      { code: "HD000124", customer: "Khách lẻ", channel: "Tại quán", cashier: "Thu ngân 1", total: 235000, createdDate: "2026-04-29", status: "Đã thanh toán" },
      { code: "HD000125", customer: "Nguyễn Minh Anh", channel: "Giao hàng", cashier: "Thu ngân 2", total: 480000, createdDate: "2026-04-29", status: "Chưa thanh toán" },
    ],
  },
  purchases: {
    title: "Nhập hàng",
    subtitle: "Lập phiếu đặt/nhập, theo dõi nhà cung cấp và chi phí mua",
    storageKey: "kiot-purchases",
    primary: "code",
    searchKeys: ["code", "supplier", "warehouse"],
    statusKey: "status",
    statusOptions: ["Phiếu tạm", "Đang nhập", "Hoàn thành", "Đã hủy"],
    fields: [
      { key: "code", label: "Mã phiếu", type: "text", required: true },
      { key: "supplier", label: "Nhà cung cấp", type: "text" },
      { key: "warehouse", label: "Kho", type: "select", options: ["Kho trung tâm", "Bếp nóng", "Quầy bar"] },
      { key: "items", label: "Số mặt hàng", type: "number" },
      { key: "total", label: "Tổng nhập", type: "number" },
      { key: "createdDate", label: "Ngày nhập", type: "date" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Phiếu tạm", "Đang nhập", "Hoàn thành", "Đã hủy"] },
    ],
    seed: [
      { code: "PN00031", supplier: "Fresh Food VN", warehouse: "Kho trung tâm", items: 18, total: 6450000, createdDate: "2026-04-29", status: "Hoàn thành" },
      { code: "PN00032", supplier: "Coffee Farm", warehouse: "Quầy bar", items: 6, total: 2280000, createdDate: "2026-04-29", status: "Đang nhập" },
    ],
  },
  "purchase-returns": {
    title: "Trả hàng nhập",
    subtitle: "Theo dõi phiếu trả nhà cung cấp, lý do trả và hoàn tiền",
    storageKey: "kiot-purchase-returns",
    primary: "code",
    searchKeys: ["code", "supplier", "reason"],
    statusKey: "status",
    statusOptions: ["Chờ xử lý", "Đã trả", "Đã hủy"],
    fields: [
      { key: "code", label: "Mã phiếu", type: "text", required: true },
      { key: "supplier", label: "Nhà cung cấp", type: "text" },
      { key: "reason", label: "Lý do", type: "select", options: ["Hàng lỗi", "Sai số lượng", "Sai giá", "Hết hạn"] },
      { key: "items", label: "Số mặt hàng", type: "number" },
      { key: "refund", label: "Tiền hoàn", type: "number" },
      { key: "createdDate", label: "Ngày trả", type: "date" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Chờ xử lý", "Đã trả", "Đã hủy"] },
    ],
    seed: [
      { code: "THN00004", supplier: "Fresh Food VN", reason: "Sai số lượng", items: 2, refund: 340000, createdDate: "2026-04-28", status: "Đã trả" },
    ],
  },
  stocktakes: {
    title: "Kiểm kho",
    subtitle: "Tạo phiếu kiểm, so sánh tồn hệ thống và tồn thực tế",
    storageKey: "kiot-stocktakes",
    primary: "code",
    searchKeys: ["code", "warehouse", "auditor"],
    statusKey: "status",
    statusOptions: ["Đang kiểm", "Đã cân bằng", "Đã hủy"],
    fields: [
      { key: "code", label: "Mã kiểm kho", type: "text", required: true },
      { key: "warehouse", label: "Kho", type: "select", options: ["Kho trung tâm", "Bếp nóng", "Quầy bar"] },
      { key: "auditor", label: "Người kiểm", type: "text" },
      { key: "variance", label: "Chênh lệch", type: "number" },
      { key: "createdDate", label: "Ngày kiểm", type: "date" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Đang kiểm", "Đã cân bằng", "Đã hủy"] },
    ],
    seed: [
      { code: "KK00012", warehouse: "Kho trung tâm", auditor: "Quản lý kho", variance: -125000, createdDate: "2026-04-29", status: "Đang kiểm" },
    ],
  },
  promotions: {
    title: "Khuyến mại",
    subtitle: "Thiết lập chương trình giảm giá, voucher và điều kiện áp dụng",
    storageKey: "kiot-promotions",
    primary: "name",
    searchKeys: ["code", "name", "scope"],
    statusKey: "status",
    statusOptions: ["Đang chạy", "Sắp chạy", "Tạm dừng", "Hết hạn"],
    fields: [
      { key: "code", label: "Mã CT", type: "text", required: true },
      { key: "name", label: "Tên chương trình", type: "text", required: true },
      { key: "scope", label: "Phạm vi", type: "select", options: ["Toàn menu", "Theo nhóm hàng", "Theo hóa đơn", "Theo khách hàng"] },
      { key: "discount", label: "Giá trị giảm", type: "number" },
      { key: "startDate", label: "Ngày bắt đầu", type: "date" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Đang chạy", "Sắp chạy", "Tạm dừng", "Hết hạn"] },
    ],
    seed: [
      { code: "KM0429", name: "Happy Lunch", scope: "Theo hóa đơn", discount: 10, startDate: "2026-04-29", status: "Đang chạy" },
    ],
  },
  cashflow: {
    title: "Sổ quỹ",
    subtitle: "Ghi nhận thu chi, phân loại dòng tiền và đối soát cuối ngày",
    storageKey: "kiot-cashflow",
    primary: "code",
    searchKeys: ["code", "category", "partner", "note"],
    statusKey: "type",
    statusOptions: ["Thu", "Chi"],
    fields: [
      { key: "code", label: "Mã phiếu", type: "text", required: true },
      { key: "type", label: "Loại phiếu", type: "select", options: ["Thu", "Chi"] },
      { key: "category", label: "Khoản mục", type: "select", options: ["Bán hàng", "Nhập hàng", "Lương", "Chi phí vận hành", "Khác"] },
      { key: "partner", label: "Đối tượng", type: "text" },
      { key: "amount", label: "Số tiền", type: "number" },
      { key: "createdDate", label: "Ngày ghi nhận", type: "date" },
      { key: "note", label: "Ghi chú", type: "text" },
    ],
    seed: [
      { code: "PT00043", type: "Thu", category: "Bán hàng", partner: "Ca sáng", amount: 3280000, createdDate: "2026-04-29", note: "Nộp tiền mặt" },
      { code: "PC00018", type: "Chi", category: "Nhập hàng", partner: "Fresh Food VN", amount: 1250000, createdDate: "2026-04-29", note: "Thanh toán rau củ" },
    ],
  },
  settings: {
    title: "Thiết lập",
    subtitle: "Cấu hình vận hành nhà hàng, thanh toán, hóa đơn và phân quyền",
    storageKey: "kiot-settings",
    primary: "name",
    searchKeys: ["name", "group", "value"],
    statusKey: "status",
    statusOptions: ["Bật", "Tắt"],
    fields: [
      { key: "group", label: "Nhóm", type: "select", options: ["Bán hàng", "Thanh toán", "Bếp", "Hóa đơn", "Bảo mật"] },
      { key: "name", label: "Thiết lập", type: "text", required: true },
      { key: "value", label: "Giá trị", type: "text" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Bật", "Tắt"] },
    ],
    seed: [
      { group: "Bán hàng", name: "Cho phép bán âm tồn", value: "Không", status: "Tắt" },
      { group: "Hóa đơn", name: "Tự động in bếp", value: "Máy in bếp 01", status: "Bật" },
      { group: "Thanh toán", name: "Làm tròn tiền mặt", value: "1.000đ", status: "Bật" },
    ],
  },
};

function formatValue(value: string | number, field: Field) {
  if (field.type === "number") {
    const n = Number(value || 0);
    return n.toLocaleString("vi-VN");
  }
  return String(value ?? "");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createBlank(fields: Field[]) {
  return fields.reduce<Record<string, string | number>>((acc, field) => {
    acc[field.key] = field.type === "number" ? 0 : field.type === "date" ? today() : field.options?.[0] ?? "";
    return acc;
  }, {});
}

function withIds(rows: Record<string, string | number>[]) {
  return rows.map((row, index) => ({ id: `${Date.now()}-${index}`, ...row }));
}

export function KiotModulePage({ moduleKey }: { moduleKey: string }) {
  const config = MODULES[moduleKey];
  const [rows, setRows] = useState<Record<string, string | number>[]>(() => {
    if (!config || typeof window === "undefined") return config ? withIds(config.seed) : [];
    const stored = window.localStorage.getItem(config.storageKey);
    return stored ? JSON.parse(stored) : withIds(config.seed);
  });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [editing, setEditing] = useState<Record<string, string | number> | null>(null);

  useEffect(() => {
    if (!config || rows.length === 0) return;
    window.localStorage.setItem(config.storageKey, JSON.stringify(rows));
  }, [config, rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !q || config.searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q));
      const matchesStatus = status === "Tất cả" || !config.statusKey || row[config.statusKey] === status;
      return matchesQuery && matchesStatus;
    });
  }, [config, query, rows, status]);

  const totals = useMemo(() => {
    const numberFields = config.fields.filter((field) => field.type === "number");
    return numberFields.map((field) => ({
      label: field.label,
      value: filteredRows.reduce((sum, row) => sum + Number(row[field.key] || 0), 0),
    }));
  }, [config.fields, filteredRows]);

  if (!config) {
    return (
      <AppShell title="Không tìm thấy module">
        <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Module chưa được cấu hình.
        </div>
      </AppShell>
    );
  }

  function startCreate() {
    setEditing({ id: `new-${Date.now()}`, ...createBlank(config.fields) });
  }

  function save() {
    if (!editing) return;
    const missing = config.fields.find((field) => field.required && !String(editing[field.key] ?? "").trim());
    if (missing) return;
    setRows((current) => {
      const exists = current.some((row) => row.id === editing.id);
      return exists ? current.map((row) => (row.id === editing.id ? editing : row)) : [editing, ...current];
    });
    setEditing(null);
  }

  function remove(id: string | number) {
    setRows((current) => current.filter((row) => row.id !== id));
    if (editing?.id === id) setEditing(null);
  }

  function resetSeed() {
    setRows(withIds(config.seed));
    setEditing(null);
  }

  function exportCsv() {
    const header = config.fields.map((field) => field.label).join(",");
    const body = filteredRows
      .map((row) => config.fields.map((field) => `"${String(row[field.key] ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.storageKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      title={config.title}
      subtitle={config.subtitle}
      right={
        <div className="flex items-center gap-2">
          <button
            onClick={resetSeed}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-[#0066cc]"
            title="Tải lại dữ liệu mẫu"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-[#0066cc]"
            title="Xuất CSV"
          >
            <Download size={18} />
          </button>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-[#0066cc]"
            title="Nhập dữ liệu"
          >
            <Upload size={18} />
          </button>
          <button
            onClick={startCreate}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0066cc] px-4 text-sm font-bold text-white hover:bg-[#0052a3]"
          >
            <Plus size={18} />
            Thêm mới
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Bản ghi</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{filteredRows.length}</div>
          </div>
          {totals.slice(0, 3).map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.label}</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{item.value.toLocaleString("vi-VN")}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo mã, tên, đối tượng..."
              className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-4 text-sm font-semibold outline-none focus:border-[#0066cc]"
            />
          </div>
          {config.statusOptions && (
            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter size={18} className="text-slate-400" />
              {["Tất cả", ...config.statusOptions].map((option) => (
                <button
                  key={option}
                  onClick={() => setStatus(option)}
                  className={`h-10 rounded-lg px-3 text-xs font-bold ${
                    status === option ? "bg-[#0066cc] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  {config.fields.map((field) => (
                    <th key={field.key} className="whitespace-nowrap px-4 py-3 font-black">
                      {field.label}
                    </th>
                  ))}
                  <th className="w-28 px-4 py-3 text-right font-black">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/40">
                    {config.fields.map((field) => (
                      <td key={field.key} className="whitespace-nowrap px-4 py-4 font-semibold text-slate-700">
                        {field.key === config.statusKey ? (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
                            {formatValue(row[field.key], field)}
                          </span>
                        ) : (
                          formatValue(row[field.key], field)
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditing(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-[#0066cc]"
                          title="Sửa"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => remove(row.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && (
            <div className="p-10 text-center text-sm font-semibold text-slate-400">
              Không có dữ liệu phù hợp bộ lọc hiện tại.
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-[#0066cc]">{config.title}</div>
                <h2 className="text-xl font-black text-slate-900">
                  {String(editing[config.primary] || "").trim() ? String(editing[config.primary]) : "Thêm mới"}
                </h2>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              {config.fields.map((field) => (
                <label key={field.key} className="space-y-2 text-sm font-bold text-slate-700">
                  <span>{field.label}</span>
                  {field.type === "select" ? (
                    <select
                      value={String(editing[field.key] ?? "")}
                      onChange={(event) => setEditing({ ...editing, [field.key]: event.target.value })}
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-[#0066cc]"
                    >
                      {field.options?.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={String(editing[field.key] ?? "")}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value,
                        })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-[#0066cc]"
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setEditing(null)}
                className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={save}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0066cc] px-5 text-sm font-bold text-white hover:bg-[#0052a3]"
              >
                <Save size={18} />
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
