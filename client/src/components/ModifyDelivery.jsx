import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { Button, Modal } from './ui';

export default function ModifyDelivery({ plan, onClose, onSaved }) {
  const [removeBeats, setRemoveBeats] = useState([]);
  const [removeRetailerIds, setRemoveRetailerIds] = useState([]);
  const bills = plan.snapshot.bills;
  const beats = [...new Set(bills.map(bill => bill.beat))].sort();
  const outlets = [...new Map(bills.map(bill => [bill.retailerId, bill])).values()];
  const remaining = bills.filter(bill => !removeBeats.includes(bill.beat) && !removeRetailerIds.includes(bill.retailerId));
  const save = useMutation({
    mutationFn: () => api(`/delivery/plans/${plan.id}/modify`, { method: 'POST', body: JSON.stringify({ removeBeats, removeRetailerIds }) }),
    onSuccess: onSaved
  });
  function toggle(value, values, setValues) { setValues(values.includes(value) ? values.filter(item => item !== value) : [...values, value]); }
  return <Modal open onClose={() => { if (!save.isPending) onClose(); }} title="Modify delivery plan" wide>
    <p className="mb-4 text-sm text-slate-600">Select beats or outlets to remove. Saving cancels the current plan and creates a replacement with the same vehicle and delivery date. Original sales invoices stay valid.</p>
    <div className="grid gap-5 sm:grid-cols-2"><fieldset><legend className="mb-2 font-semibold">Remove beats</legend><div className="max-h-64 space-y-2 overflow-y-auto">{beats.map(beat => <label key={beat} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={save.isPending} checked={removeBeats.includes(beat)} onChange={() => toggle(beat, removeBeats, setRemoveBeats)}/>{beat}</label>)}</div></fieldset>
      <fieldset><legend className="mb-2 font-semibold">Remove outlets</legend><div className="max-h-64 space-y-2 overflow-y-auto">{outlets.map(outlet => {
        const excludedByBeat = bills.filter(bill => bill.retailerId === outlet.retailerId).every(bill => removeBeats.includes(bill.beat));
        return <label key={outlet.retailerId} className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={excludedByBeat || save.isPending} checked={excludedByBeat || removeRetailerIds.includes(outlet.retailerId)} onChange={() => toggle(outlet.retailerId, removeRetailerIds, setRemoveRetailerIds)}/><span>{outlet.party}<span className="block text-xs text-slate-500">{outlet.beat}{excludedByBeat ? ' · removed with beat' : ''}</span></span></label>;
      })}</div></fieldset></div>
    <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm"><p>{bills.length - remaining.length} bills removed · {remaining.length} bills remain</p><p className="mt-1 font-semibold">New bill value {money(remaining.reduce((sum, bill) => sum + bill.total, 0))}</p></div>
    {!remaining.length && <p className="mt-3 text-sm text-red-700">No bills remain. Close this dialog and use Cancel Plan to cancel the whole delivery.</p>}
    {save.error && <p role="alert" className="mt-3 text-red-700">{save.error.message}</p>}
    <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" disabled={save.isPending} onClick={onClose}>Back</Button><Button disabled={save.isPending || !remaining.length || remaining.length === bills.length} loading={save.isPending} onClick={() => save.mutate()}>Cancel old plan and create replacement</Button></div>
  </Modal>;
}
