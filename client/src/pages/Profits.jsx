import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ReceiptText, Boxes, CircleDollarSign } from 'lucide-react';
import { api } from '../lib/api';
import { money, today } from '../lib/format';
import { Card, Input, PageHeader, Stat } from '../components/ui';

function monthStart(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10)}
export default function Profits(){
 const [from,setFrom]=useState(monthStart());const [to,setTo]=useState(today());
 const {data}=useQuery({queryKey:['profit',from,to],queryFn:()=>api(`/reports/profit?from=${from}&to=${to}`)});
 return <><PageHeader title="Profit" description="Profit uses saved invoice cost snapshots, not today's product cost."/><Card className="mb-5 p-4"><div className="grid gap-4 sm:grid-cols-2"><Input label="From" type="date" value={from} onChange={e=>setFrom(e.target.value)}/><Input label="To" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div></Card><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Taxable sales" value={money(data?.taxableSales)} sub={`${data?.invoiceCount||0} invoices`} icon={ReceiptText}/><Stat label="Cost of goods" value={money(data?.cogs)} sub="Historical invoice cost" icon={Boxes}/><Stat label="Gross profit" value={money(data?.grossProfit)} sub="Sales minus COGS" icon={TrendingUp}/><Stat label="Net profit" value={money(data?.netProfit)} sub={`After ${money(data?.operatingExpenses)} expenses`} icon={CircleDollarSign}/></div><Card className="mt-5 p-5"><h2 className="font-bold">Profit calculation</h2><div className="mt-4 space-y-3 text-sm"><Row label="Taxable sales" value={data?.taxableSales}/><Row label="Less: Cost of goods sold" value={-(data?.cogs||0)}/><div className="border-t border-slate-100 pt-3"><Row label="Gross profit" value={data?.grossProfit} bold/></div><Row label="Less: Operating expenses" value={-(data?.operatingExpenses||0)}/><div className="border-t border-slate-200 pt-3"><Row label="Net operating profit" value={data?.netProfit} bold/></div></div></Card></>;
}
function Row({label,value,bold}){return <div className={`flex justify-between gap-3 ${bold?'font-bold text-slate-950':'text-slate-600'}`}><span>{label}</span><span>{money(value)}</span></div>}
