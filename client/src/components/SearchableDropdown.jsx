import { useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function SearchableDropdown({ label, options, value, onChange, multiple = false, disabled = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const trigger = useRef(null);
  const id = useId();
  const selected = multiple ? value || [] : [String(value ?? '')];
  const matches = options.filter(option => option.label.toLowerCase().includes(query.trim().toLowerCase()));
  const selectedLabels = options.filter(option => selected.includes(String(option.value))).map(option => option.label);
  const display = selectedLabels.join(', ') || (multiple ? 'Select beats…' : 'Select…');
  function close() { setOpen(false); setQuery(''); }
  function choose(option) {
    if (multiple) onChange(selected.includes(option.value) ? selected.filter(v => v !== option.value) : [...selected, option.value]);
    else { onChange({ target: { value: option.value } }); close(); trigger.current?.focus(); }
  }
  return <div className="relative space-y-1.5" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }} onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); close(); trigger.current?.focus(); }
    if (event.key === 'ArrowDown') { event.preventDefault(); const buttons = [...event.currentTarget.querySelectorAll('[data-choice]:not(:disabled)')]; const index = buttons.indexOf(document.activeElement); buttons[Math.min(index + 1, buttons.length - 1)]?.focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); const buttons = [...event.currentTarget.querySelectorAll('[data-choice]:not(:disabled)')]; const index = buttons.indexOf(document.activeElement); if (index > 0) buttons[index - 1].focus(); }
  }}>
    <span id={`${id}-label`} className="text-sm font-medium text-slate-700">{label}</span>
    <button type="button" ref={trigger} disabled={disabled} aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => { setOpen(!open); setQuery(''); }} className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:opacity-50 ${className}`}><span id={`${id}-value`} className="min-w-0 truncate">{display}</span><ChevronDown size={18} className="shrink-0"/></button>
    {open && <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-label`} className="relative z-20 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
      <input autoFocus aria-label={`Search ${label}`} placeholder="Type to search…" value={query} onChange={e => setQuery(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-slate-400"/>
      <div className="mt-1 max-h-52 overflow-y-auto">{matches.map(option => <button type="button" data-choice key={option.value} disabled={option.disabled} aria-pressed={selected.includes(String(option.value))} onClick={() => choose(option)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-100 focus:bg-slate-100 focus:outline-none disabled:opacity-50"><span className="w-4 shrink-0">{selected.includes(String(option.value)) && <Check size={16}/>}</span>{option.label}</button>)}{!matches.length && <p role="status" className="p-3 text-sm text-slate-500">No matches found</p>}</div>
    </div>}
  </div>;
}
