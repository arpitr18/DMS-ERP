import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowRight } from 'lucide-react';
import { api, setSession } from '../lib/api';
import { Button, Input } from '../components/ui';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const navigate = useNavigate();
  async function submit(e) { e.preventDefault(); setLoading(true); setError(''); try { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) }); setSession(data.token, data.user); navigate('/'); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"><div className="w-full max-w-md"><div className="mb-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white"><Store size={26}/></div><h1 className="mt-4 text-2xl font-bold text-slate-950">Distribution Management</h1><p className="mt-2 text-sm text-slate-500">Billing, stock, collections and business operations in one place.</p></div><form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-7"><Input label="Email" type="email" autoComplete="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/><Input label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/>{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<Button className="w-full" loading={loading}>Sign in <ArrowRight size={17}/></Button></form></div></main>;
}
