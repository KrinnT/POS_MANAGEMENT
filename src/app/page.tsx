import Link from "next/link";
import { LayoutDashboard, MonitorSmartphone, UtensilsCrossed, PackageSearch, Users, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl p-6 flex flex-col h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/20">
            K
          </div>
          <h1 className="text-xl font-bold tracking-tight">KrinnT POS</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active />
          <NavItem href="/pos" icon={<MonitorSmartphone size={20} />} label="POS Terminal" />
          <NavItem href="/kds" icon={<UtensilsCrossed size={20} />} label="Kitchen Display" />
          <NavItem href="/inventory" icon={<PackageSearch size={20} />} label="Inventory" />
          <NavItem href="/staff" icon={<Users size={20} />} label="Staff Management" />
        </nav>
        
        <div className="pt-6 border-t border-slate-800">
          <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
            <p className="text-slate-400 mt-1">Today's metrics and real-time updates.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-300">Admin</p>
              <p className="text-xs text-slate-500">System Manager</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700"></div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Today's Revenue" value="$4,289.00" trend="+12.5%" />
          <StatCard title="Total Orders" value="156" trend="+8.2%" />
          <StatCard title="Active Tables" value="12/20" trend="High load" neutral />
          <StatCard title="Avg. Wait Time" value="8.5 min" trend="-1.2 min" />
        </div>

        {/* Recent Orders Table */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Active Orders</h3>
            <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="pb-3 font-medium">Order ID</th>
                  <th className="pb-3 font-medium">Table</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Items</th>
                  <th className="pb-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                <TableRow id="#ORD-001" table="Table 04" status="Preparing" items="3 items" total="$42.50" />
                <TableRow id="#ORD-002" table="Table 12" status="Pending" items="5 items" total="$89.00" />
                <TableRow id="#ORD-003" table="Table 07" status="Served" items="2 items" total="$24.00" />
                <TableRow id="#ORD-004" table="Table 01" status="Completed" items="4 items" total="$65.00" />
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function StatCard({ title, value, trend, neutral = false }: { title: string, value: string, trend: string, neutral?: boolean }) {
  const isPositive = trend.startsWith('+') || trend.startsWith('-'); // simplified logic
  const colorClass = neutral ? 'text-blue-400 bg-blue-500/10' : (trend.startsWith('+') || trend.startsWith('-1') ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10');
  
  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5">
      <h4 className="text-slate-400 font-medium mb-2">{title}</h4>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${colorClass}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function TableRow({ id, table, status, items, total }: { id: string, table: string, status: string, items: string, total: string }) {
  const statusColors: Record<string, string> = {
    'Pending': 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    'Preparing': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    'Served': 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    'Completed': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  };
  
  return (
    <tr className="group hover:bg-slate-800/20 transition-colors">
      <td className="py-4 font-medium text-slate-300">{id}</td>
      <td className="py-4">{table}</td>
      <td className="py-4">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
          {status}
        </span>
      </td>
      <td className="py-4 text-slate-400">{items}</td>
      <td className="py-4 font-medium">{total}</td>
    </tr>
  );
}
