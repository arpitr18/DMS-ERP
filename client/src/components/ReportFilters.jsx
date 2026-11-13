import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { today } from '../lib/format';
import { Card, Input, Select } from './ui';

export function useReportFilters() {
  const [filters,setFilters]=useState({period:'range',from:today().slice(0,7)+'-01',to:today(),day:today(),month:today().slice(0,7),year:today().slice(0,4),retailerId:'',market:''});
  let {from,to}=filters;
  if(filters.period==='day') from=to=filters.day;
  if(filters.period==='month') {from=filters.month+'-01';const [y,m]=filters.month.split('-').map(Number);to=filters.month+'-'+new Date(y,m,0).getDate();}
  if(filters.period==='year') {from=filters.year+'-01-01';to=filters.year+'-12-31';}
  return {filters,setFilters,query:new URLSearchParams({from,to,retailerId:filters.retailerId,market:filters.market}).toString()};
}

export default function ReportFilters({filters,setFilters}) {
  const {data:retailers=[]}=useQuery({queryKey:['retailers'],queryFn:()=>api('/retailers')});
  const set=(key,value)=>setFilters({...filters,[key]:value});
  const markets=[...new Set(retailers.map(r=>r.market).filter(Boolean))].sort();
  return <Card className="mb-5 grid gap-4 p-4 sm:grid-cols-3">
    <Select label="Period" value={filters.period} onChange={e=>set('period',e.target.value)}><option value="range">Date range</option><option value="day">Day wise</option><option value="month">Monthly</option><option value="year">Yearly</option></Select>
    {filters.period==='range'?<><Input label="From" type="date" value={filters.from} onChange={e=>set('from',e.target.value)}/><Input label="To" type="date" value={filters.to} onChange={e=>set('to',e.target.value)}/></>:<Input label={filters.period} type={filters.period==='day'?'date':filters.period==='month'?'month':'number'} value={filters[filters.period]} onChange={e=>set(filters.period,e.target.value)}/>}
    <Select label="Beat" value={filters.market} onChange={e=>setFilters({...filters,market:e.target.value,retailerId:''})}><option value="">All beats</option>{markets.map(m=><option key={m}>{m}</option>)}</Select>
    <Select label="Outlet / retailer" value={filters.retailerId} onChange={e=>set('retailerId',e.target.value)}><option value="">All outlets</option>{retailers.filter(r=>!filters.market||r.market===filters.market).map(r=><option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}</Select>
  </Card>;
}
