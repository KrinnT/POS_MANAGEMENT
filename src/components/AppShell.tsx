"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === href : Boolean(pathname?.startsWith(href));

  return (
    <Link
      href={href}
      className={`px-6 py-2 text-sm font-black rounded-2xl transition-all duration-300 uppercase tracking-wider ${
        active 
          ? "bg-white text-[#0066cc] shadow-lg shadow-white/10 scale-105" 
          : "text-white/60 hover:text-white hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {/* Premium Glass Header */}
      <nav className="h-[70px] bg-[#0066cc] flex items-center px-8 gap-8 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,102,204,0.15)] border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center font-black text-[#0066cc] text-lg group-hover:rotate-12 transition-transform shadow-xl shadow-black/10">K</div>
          <div className="flex flex-col">
            <span className="font-black text-white leading-none tracking-tighter text-lg">KiotViet</span>
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mt-0.5">Enterprise</span>
          </div>
        </Link>
        
        <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
          <NavItem href="/admin" label="Tổng quan" />
          <NavItem href="/admin/menu" label="Hàng hóa" />
          <NavItem href="/admin/customers" label="Khách hàng" />
          <NavItem href="/admin/invoices" label="Hóa đơn" />
          <NavItem href="/admin/purchases" label="Nhập hàng" />
          <NavItem href="/admin/purchase-returns" label="Trả nhập" />
          <NavItem href="/admin/stocktakes" label="Kiểm kho" />
          <NavItem href="/admin/tables" label="Phòng/Bàn" />
          <NavItem href="/admin/staff" label="Nhân viên" />
          <NavItem href="/admin/promotions" label="Khuyến mại" />
          <NavItem href="/admin/cashflow" label="Sổ quỹ" />
          <NavItem href="/pos" label="Bán hàng" />
          <NavItem href="/admin/reports" label="Báo cáo" />
          <NavItem href="/admin/settings" label="Thiết lập" />
        </div>

        <div className="flex items-center gap-6">
          <button className="hidden lg:flex items-center gap-2 text-[10px] font-black bg-[#4caf50] px-5 py-2.5 rounded-2xl text-white uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
            Hỗ trợ 24/7
          </button>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Admin</span>
                <span className="text-xs font-black text-white tracking-tight">Trần Khánh Tường</span>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-sm font-black border border-white/10 hover:bg-white/20 transition-all cursor-pointer shadow-inner">TK</div>
          </div>
        </div>
      </nav>

      {/* Hero Header Section */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="mx-auto max-w-7xl px-8 py-10 flex items-end justify-between">
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{title}</h1>
            {subtitle && (
              <div className="flex items-center gap-3">
                <div className="w-1 h-4 bg-[#0066cc] rounded-full"></div>
                <p className="text-slate-400 font-bold text-sm tracking-wide">{subtitle}</p>
              </div>
            )}
          </div>
          {right && <div className="animate-in fade-in slide-in-from-right-4 duration-500">{right}</div>}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-8 py-12">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          {children}
        </div>
      </main>

      <footer className="mt-40 border-t border-slate-100 py-16 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-300">K</div>
        <div className="text-[10px] text-slate-300 font-black uppercase tracking-[0.5em]">
          KrinnT POS Enterprise v2.0
        </div>
        <div className="text-xs text-slate-400 font-medium">© 2026 Toàn bộ quyền được bảo lưu</div>
      </footer>
    </div>
  );
}
