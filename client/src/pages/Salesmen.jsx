import SearchableDropdown from '../components/SearchableDropdown';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button, Card, Input, Modal, PageHeader, EmptyState } from '../components/ui';

export default function Salesmen() {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const { data = [], isPending, error: loadError } = useQuery({ queryKey: ['salesmen'], queryFn: () => api('/masters/salesmen') });
  const { data: beats = [] } = useQuery({ queryKey: ['beats'], queryFn: () => api('/masters/beats') });
  const save = useMutation({ mutationFn: () => api('/masters/salesmen' + (form.id ? `/${form.id}` : ''), { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(form) }),
    onSuccess: () => { qc.invalidateQueries(); setForm(null); }, onError: e => setError(e.message) });
  return <><PageHeader title="Salesmen" description="Manage staff contact details and assigned beats." action={<Button onClick={() => { setError(''); setForm({ name: '', phone: '', email: '', active: true, beatIds: [] }); }}>Add salesman</Button>}/>
    {loadError && <p role="alert" className="text-red-700">{loadError.message}</p>}
    <Card>{isPending ? <p className="p-4">Loading salesmen…</p> : !data.length ? <EmptyState title="No salesmen yet"/> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-4">Name</th><th>Phone / email</th><th>Beats</th><th>Status</th><th/></tr></thead><tbody>{data.map(s => <tr key={s.id} className="border-t"><td className="p-4 font-semibold">{s.name}</td><td>{s.phone || '—'}<br/>{s.email}</td><td>{s.beats.map(link => link.beat.name).join(', ') || 'Unassigned'}</td><td>{s.active ? 'Active' : 'Inactive'}</td><td className="p-2"><Button variant="secondary" onClick={() => { setError(''); setForm({ id: s.id, name: s.name, phone: s.phone || '', email: s.email || '', active: s.active, beatIds: s.beats.map(link => link.beatId) }); }}>Edit</Button></td></tr>)}</tbody></table></div>}</Card>
    <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'Edit salesman' : 'Add salesman'}>{form && <div className="space-y-4"><Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/><Input label="Phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/><Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/><SearchableDropdown label="Assigned beats" multiple value={form.beatIds} onChange={beatIds => setForm({ ...form, beatIds })} options={beats.filter(b => b.active || form.beatIds.includes(b.id)).map(b => ({ value: b.id, label: b.name + (b.active ? '' : ' (inactive)') }))}/><label className="flex gap-2"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}/>Active</label>{error && <p role="alert" className="text-red-700">{error}</p>}<Button disabled={!form.name.trim()} loading={save.isPending} onClick={() => save.mutate()}>Save salesman</Button></div>}</Modal>
  </>;
}
