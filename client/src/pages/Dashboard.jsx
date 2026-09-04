import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ReceiptText, WalletCards, CircleDollarSign, Boxes, BadgeIndianRupee, PackageSearch, Store, ShoppingCart, Package, FileBarChart } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { Card, PageHeader, Stat } from '../components/ui';

const modules = [
  ['Create Bill', '/billing', ReceiptText, 'New retailer invoice'],
  ['Products', '/products', Package, 'Product master & upload'],
  ['Retailers', '/retailers', Store, 'Party master & ledger'],
  ['Selling Master', '/selling-master', BadgeIndianRupee, 'Retailer-specific rates'],
  ['Purchases', '/purchases', ShoppingCart, 'Daily inward stock'],
  ['Collections', '/collections', WalletCards, 'Receive & track payments'],
  ['Inventory', '/inventory', Boxes, 'Live stock position'],
  ['Reports', '/reports', FileBarChart, 'Business summaries']
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => api('/dashboard') });
  return <>
    <PageHeader title="Dashboard" description="A simple view of today and your current business position." />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Today's sales" value={isLoading ? '—' : money(data?.today.sales)} sub={`${data?.today.bills || 0} bills`} icon={ReceiptText}/>
      <Stat label="Collections" value={isLoading ? '—' : money(data?.today.collections)} sub="Received today" icon={WalletCards}/>
      <Stat label="Outstanding" value={isLoading ? '—' : money(data?.totalOutstanding)} sub="Across retailers" icon={CircleDollarSign}/>
      <Stat label="Inventory value" value={isLoading ? '—' : money(data?.inventoryValue)} sub={`${data?.lowStockCount || 0} low stock`} icon={Boxes}/>
    </div>

    <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <Card className="p-4 sm:p-5"><div className="mb-4"><h2 className="font-bold text-slate-950">Last 7 days</h2><p className="text-sm text-slate-500">Sales and collections trend</p></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.sevenDays || []}><defs><linearGradient id="sales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0f172a" stopOpacity={0.22}/><stop offset="95%" stopColor="#0f172a" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tick={{fontSize:11}} tickFormatter={v => v.slice(5)}/><YAxis tick={{fontSize:11}} width={55}/><Tooltip formatter={v => money(v)}/><Area type="monotone" dataKey="sales" stroke="#0f172a" fill="url(#sales)" strokeWidth={2}/><Area type="monotone" dataKey="collections" stroke="#64748b" fillOpacity={0} strokeWidth={2}/></AreaChart></ResponsiveContainer></div></Card>
      <Card className="p-4 sm:p-5"><h2 className="font-bold text-slate-950">This month</h2><div className="mt-4 divide-y divide-slate-100"><Row label="Sales" value={money(data?.month.sales)}/><Row label="Collections" value={money(data?.month.collections)}/><Row label="Expenses" value={money(data?.month.expenses)}/><Row label="Active retailers" value={data?.retailerCount || 0}/><Row label="Active products" value={data?.productCount || 0}/></div></Card>
    </div>

    <div className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-950">Business modules</h2><PackageSearch size={20} className="text-slate-400"/></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{modules.map(([label,path,Icon,desc]) => <button key={path} onClick={() => navigate(path)} className="min-h-36 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-slate-300"><div className="inline-flex rounded-xl bg-slate-100 p-2.5 text-slate-800"><Icon size={20}/></div><p className="mt-4 font-bold text-slate-950">{label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p></button>)}</div></div>
  </>;
}
function Row({label,value}) { return <div className="flex items-center justify-between py-3 text-sm"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-900">{value}</span></div>; }
