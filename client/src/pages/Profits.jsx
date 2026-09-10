import ReportFilters, { useReportFilters } from '../components/ReportFilters';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ReceiptText, Boxes, CircleDollarSign } from 'lucide-react';
import { api } from '../lib/api';
import { money, today } from '../lib/format';
import { Card, Input, PageHeader, Stat } from '../components/ui';

function monthStart(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10)}
export default function Profits(){
 const {filters,setFilters,query}=useReportFilters();
 const {data}=useQuery({queryKey:['Profits',query],queryFn:()=>api('/reports/profit?'+query)});
 return <><PageHeader title="Profit" description="Profit uses saved invoice cost snapshots, not today's product cost."/><ReportFilters filters={filters} setFilters={setFilters}/>{data?.scoped&&<p className="mb-4 text-sm text-slate-600">Outlet/area totals exclude unallocated business expenses and purchases. Profit shown is gross profit.</p>}<div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Taxable sales" value={money(data?.taxableSales)} sub={`${data?.invoiceCount||0} invoices`} icon={ReceiptText}/><Stat label="Cost of goods" value={money(data?.cogs)} sub="Historical invoice cost" icon={Boxes}/><Stat label="Gross profit" value={money(data?.grossProfit)} sub="Sales minus COGS" icon={TrendingUp}/><Stat label={data?.scoped?"Outlet gross profit":"Net profit"} value={money(data?.scoped?data?.grossProfit:data?.netProfit)} sub={data?.scoped?"Expenses are not allocated to outlets":`After ${money(data?.operatingExpenses)} expenses`} icon={CircleDollarSign}/></div><Card className="mt-5 p-5"><h2 className="font-bold">Profit calculation</h2><div className="mt-4 space-y-3 text-sm"><Row label="Taxable sales" value={data?.taxableSales}/><Row label="Less: Cost of goods sold" value={-(data?.cogs||0)}/><div className="border-t border-slate-100 pt-3"><Row label="Gross profit" value={data?.grossProfit} bold/></div><Row label="Less: Operating expenses" value={-(data?.operatingExpenses||0)}/><div className="border-t border-slate-200 pt-3"><Row label={data?.scoped?"Gross profit (expenses unallocated)":"Net operating profit"} value={data?.scoped?data?.grossProfit:data?.netProfit} bold/></div></div></Card></>;
}
function Row({label,value,bold}){return <div className={`flex justify-between gap-3 ${bold?'font-bold text-slate-950':'text-slate-600'}`}><span>{label}</span><span>{money(value)}</span></div>}
