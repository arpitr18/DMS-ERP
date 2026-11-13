import { Trash2 } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import LocationFields from '../components/LocationFields';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button, Card, Input, Modal, PageHeader, EmptyState } from '../components/ui';

export default function BeatMaster() {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const { data = [], isPending, error: loadError } = useQuery({ queryKey: ['beats'], queryFn: () => api('/masters/beats') });
  const save = useMutation({ mutationFn: () => api('/masters/beats' + (form.id ? `/${form.id}` : ''), { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(form) }),
    onSuccess: () => { qc.invalidateQueries(); setForm(null); }, onError: e => setError(e.message) });
  const remove = useMutation({ mutationFn: id => api('/masters/beats/' + id, { method: 'DELETE' }), onSuccess: () => { qc.invalidateQueries(); setDeleting(null); },  });
  const status = useMutation({ mutationFn: beat => api('/masters/beats/' + beat.id + '/status', { method: 'PATCH', body: JSON.stringify({ active: !beat.active }) }), onSuccess: () => { qc.invalidateQueries(); setError(''); }, onError: e => setError(e.message) });
  return <><PageHeader title="Beat Master" description="Manage beats used by retailers and salesmen." action={<Button onClick={() => { setError(''); setForm({ name: '', active: true, address: '', state: '', stateId: '', cityId: '' }); }}>Add beat</Button>}/>
    {loadError && <p role="alert" className="text-red-700">{loadError.message}</p>}
    {error && !form && <p role="alert" className="mb-3 text-red-700">{error}</p>}
    <Card>{isPending ? <p className="p-4">Loading beats…</p> : !data.length ? <EmptyState title="Add your first beat"/> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-4">Beat</th><th>Location</th><th>Retailers</th><th>Salesmen</th><th>Status</th><th/></tr></thead><tbody>{data.map(b => <tr key={b.id} className="border-t"><td className="p-4 font-semibold">{b.name}</td><td>{[b.city,b.state].filter(Boolean).join(', ')||'Not mapped'}</td><td>{b._count.retailers}</td><td>{b._count.salesmen}</td><td>{b.active ? 'Active' : 'Inactive'}</td><td className="p-2"><div className="flex items-center justify-end gap-2"><Button variant="secondary" onClick={() => { setError(''); setForm({ id: b.id, name: b.name, active: b.active, address: b.address || '', state: b.state || '', stateId: b.stateId || '', cityId: b.cityId || '' }); }}>Edit</Button><Button variant="secondary" disabled={status.isPending} onClick={() => status.mutate(b)}>{b.active ? 'Deactivate' : 'Activate'}</Button><button type="button" aria-label={`Delete beat ${b.name}`} title={b._count.retailers || b._count.salesmen ? 'Assigned beats can only be deactivated' : 'Delete beat'} disabled={remove.isPending || Boolean(b._count.retailers || b._count.salesmen)} onClick={() => { remove.reset(); setDeleting(b); }} className="rounded-xl p-2.5 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={18}/></button></div></td></tr>)}</tbody></table></div>}</Card>
    <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'Edit beat' : 'Add beat'}>{form && <div className="space-y-4"><Input label="Beat name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/><LocationFields value={form} onChange={setForm}/><Input label="Street / locality address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/><label className="flex gap-2"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}/>Active</label><p className="text-sm text-slate-500">Inactive beats remain on existing records and cannot be assigned to new retailers.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<Button disabled={!form.name.trim()||!form.cityId} loading={save.isPending} onClick={() => save.mutate()}>Save beat</Button></div>}</Modal>
    <ConfirmDialog open={Boolean(deleting)} title="Delete beat?" pending={remove.isPending} error={remove.error?.message} onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) remove.mutate(deleting.id); }}><p>Delete <strong>{deleting?.name}</strong>? This cannot be undone.</p><p className="mt-2">Beats assigned to retailers or salesmen cannot be deleted.</p></ConfirmDialog>
  </>;
}
