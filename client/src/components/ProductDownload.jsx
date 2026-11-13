import { useId, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { downloadImportTemplate } from '../lib/api';
import { Button } from './ui';

export default function ProductDownload() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const trigger = useRef(null);
  const id = useId();
  async function download(master) {
    setOpen(false);
    setLoading(true);
    setError('');
    trigger.current?.focus();
    try { await downloadImportTemplate('products', master); }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }
  return <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }}>
    <Button ref={trigger} variant="secondary" disabled={loading} loading={loading} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><Download size={17}/>Download<ChevronDown size={15}/></Button>
    {open && <div id={id} className="absolute left-0 top-full z-30 mt-2 min-w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"><button type="button" onClick={() => download(false)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100 focus:bg-slate-100"><Download size={16}/>Template</button><button type="button" onClick={() => download(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100 focus:bg-slate-100"><Download size={16}/>Master</button></div>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}
