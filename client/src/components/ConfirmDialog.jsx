import { useEffect, useId, useRef } from 'react';
import { Button } from './ui';

export default function ConfirmDialog({ open, title, children, pending, error, onCancel, onConfirm }) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current.open) dialog.current.close();
  }, [open]);
  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); if (!pending) onCancel(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-6 shadow-2xl backdrop:bg-slate-950/40">
    <h2 id={titleId} className="text-lg font-bold text-slate-950">{title}</h2>
    <div id={descriptionId} className="mt-3 text-sm text-slate-600">{children}</div>
    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><Button autoFocus variant="secondary" disabled={pending} onClick={onCancel}>Cancel</Button><Button variant="danger" loading={pending} disabled={pending} onClick={onConfirm}>Delete</Button></div>
  </dialog>;
}
