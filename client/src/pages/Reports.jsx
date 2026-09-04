import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReceiptText, WalletCards, ShoppingCart, CircleDollarSign } from 'lucide-react';
import { api } from '../lib/api';
import { money, today } from '../lib/format';
import { Card, Input, PageHeader, Stat } from '../components/ui';

function monthStart(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10)}
export default function Reports(){
 const [from,setFrom]=useState(monthStart());const [to,setTo]=useState(today()); const {data}=useQuery({queryKey:['report-summary',from,to],queryFn:()=>api(`/reports/summary?from=${from}&to=${to}`)});
 return <><PageHeader title="Reports" description="A concise period summary for sales, collections, purchases and expenses."/><Card className="mb-5 p-4"><div className="grid gap-4 sm:grid-cols-2"><Input label="From" type="date" value={from} onChange={e=>setFrom(e.target.value)}/><Input label="To" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div></Card><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Sales" value={money(data?.sales)} sub={`${data?.bills||0} bills`} icon={ReceiptText}/><Stat label="Collections" value={money(data?.collections)} sub={`${data?.collectionCount||0} receipts`} icon={WalletCards}/><Stat label="Purchases" value={money(data?.purchases)} sub={`${data?.purchaseCount||0} entries`} icon={ShoppingCart}/><Stat label="Expenses" value={money(data?.expenses)} sub={`${data?.expenseCount||0} entries`} icon={CircleDollarSign}/></div><Card className="mt-5 p-5"><h2 className="font-bold">Cash-flow reference</h2><p className="mt-1 text-sm text-slate-500">Sales and collections are intentionally separate. Credit sales do not mean cash was received on the same day.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Sales minus collections</p><p className="mt-2 text-xl font-bold">{money((data?.sales||0)-(data?.collections||0))}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Purchases + expenses</p><p className="mt-2 text-xl font-bold">{money((data?.purchases||0)+(data?.expenses||0))}</p></div></div></Card></>;
}
