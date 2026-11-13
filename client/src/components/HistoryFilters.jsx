import { useState } from 'react';
import { billDateRange } from '../lib/billDates';
import { Button, Input, Select } from './ui';

const blank = { period: 'range', from: '', to: '', day: '', week: '', month: '', year: '', market: '', retailerId: '', supplier: '', q: '' };
export function useHistoryFilters() {
  const [filters, setFilters] = useState(blank);
  const range = filters.period === 'day' ? { from: filters.day, to: filters.day } : billDateRange(filters.period, filters);
  const invalid = Boolean(range.from && range.to && range.from > range.to);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...range, market: filters.market, retailerId: filters.retailerId, supplier: filters.supplier, q: filters.q.trim() })) if (value) params.set(key, value);
  return { filters, setFilters, query: params.toString(), invalid };
}

export default function HistoryFilters({ filters, onChange, retailers, suppliers, beats = [] }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });
  const beatNames = [...new Set([...beats.map(b => b.name), ...(retailers || []).map(r => r.market)])].filter(Boolean).sort();
  return <div className="border-b border-slate-100 p-4"><div className="grid gap-4 sm:grid-cols-3">
    <Select label="Period" value={filters.period} onChange={e => set('period', e.target.value)}><option value="all">All dates</option><option value="range">Date range</option><option value="day">Day wise</option><option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Yearly</option></Select>
    {filters.period === 'range' && <><Input label="From" type="date" value={filters.from} onChange={e => set('from', e.target.value)}/><Input label="To" type="date" value={filters.to} onChange={e => set('to', e.target.value)}/></>}
    {['day', 'week', 'month'].includes(filters.period) && <Input label={filters.period === 'day' ? 'Day' : filters.period === 'week' ? 'Week' : 'Month'} type={filters.period === 'day' ? 'date' : filters.period} value={filters[filters.period]} onChange={e => set(filters.period, e.target.value)}/>}
    {filters.period === 'year' && <Select label="Year" value={filters.year} onChange={e => set('year', e.target.value)}><option value="">All years</option>{Array.from({ length: 100 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => <option key={y}>{y}</option>)}</Select>}
    {retailers && <><Select label="Beat" value={filters.market} onChange={e => onChange({ ...filters, market: e.target.value, retailerId: '' })}><option value="">All beats</option>{beatNames.map(name => <option key={name}>{name}</option>)}</Select><Select label="Outlet / retailer" value={filters.retailerId} onChange={e => set('retailerId', e.target.value)}><option value="">All outlets</option>{retailers.filter(r => !filters.market || r.market === filters.market).map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}</Select></>}
    {suppliers && <Select label="Supplier" value={filters.supplier} onChange={e => set('supplier', e.target.value)}><option value="">All suppliers</option>{suppliers.map(s => <option key={s}>{s}</option>)}</Select>}
  </div><div className="mt-4 flex items-end gap-2"><div className="max-w-lg flex-1"><Input label="Search" placeholder={retailers ? 'Invoice or retailer name' : 'Supplier invoice, supplier or product'} value={filters.q} onChange={e => set('q', e.target.value)}/></div><Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => onChange({ ...blank })}>Reset</Button></div></div>;
}
