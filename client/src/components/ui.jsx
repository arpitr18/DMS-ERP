import { X, Loader2 } from 'lucide-react';

export function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-soft ${className}`}>{children}</div>;
}

export function Button({ children, className = '', variant = 'primary', loading = false, ...props }) {
  const base = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100'
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{loading && <Loader2 size={16} className="animate-spin" />}{children}</button>;
}

export function Input({ label, hint, className = '', ...props }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">{label}</span><input className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 ${className}`} {...props} />{hint && <span className="text-xs text-slate-500">{hint}</span>}</label>;
}

export function Select({ label, children, className = '', ...props }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">{label}</span><select className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 ${className}`} {...props}>{children}</select></label>;
}

export function Textarea({ label, className = '', ...props }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">{label}</span><textarea className={`min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 ${className}`} {...props} /></label>;
}

export function PageHeader({ title, description, action }) {
  return <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>{action && <div>{action}</div>}</div>;
}

export function EmptyState({ title = 'No data yet', description = 'Add your first record to get started.' }) {
  return <div className="p-8 text-center"><p className="font-semibold text-slate-800">{title}</p><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

export function Modal({ open, title, children, onClose, wide = false }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
    <div className={`max-h-[92vh] w-full overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`} onMouseDown={e => e.stopPropagation()}>
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-950">{title}</h2><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}><X size={20} /></button></div>
      {children}
    </div>
  </div>;
}

export function Stat({ label, value, sub, icon: Icon }) {
  return <Card className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-xl font-bold text-slate-950 sm:text-2xl">{value}</p>{sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}</div>{Icon && <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon size={20} /></div>}</div></Card>;
}
