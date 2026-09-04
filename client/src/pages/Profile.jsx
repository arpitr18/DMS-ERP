import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, KeyRound, Mail, MapPin, Pencil, Phone, ReceiptText, Save, ShieldCheck, UserRound } from "lucide-react";
import { Button, Card, Input, Modal, PageHeader, Textarea } from "../components/ui";
import { api, getUser, setSession } from "../lib/api";

const emptyBusiness = { businessName: "", gstin: "", address: "", phone: "", state: "", invoicePrefix: "INV" };

export default function Profile() {
  const queryClient = useQueryClient();
  const cachedUser = getUser();
  const { data: userData } = useQuery({ queryKey: ["profile"], queryFn: () => api("/profile") });
  const { data: businessData, isLoading: businessLoading } = useQuery({ queryKey: ["settings"], queryFn: () => api("/settings") });
  const [accountOpen, setAccountOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [account, setAccount] = useState({ name: "", email: "" });
  const [business, setBusiness] = useState(emptyBusiness);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [accountState, setAccountState] = useState({ loading: false, error: "" });
  const [businessState, setBusinessState] = useState({ loading: false, error: "" });
  const [passwordState, setPasswordState] = useState({ loading: false, error: "" });
  const [notice, setNotice] = useState("");

  const user = userData || cachedUser;
  const canEditBusiness = ["DISTRIBUTOR", "ADMIN"].includes(user?.role);
  const displayedBusiness = businessData || emptyBusiness;
  const initial = user?.name?.trim().charAt(0).toUpperCase() || "?";

  function openAccountEditor() {
    setAccount({ name: user?.name || "", email: user?.email || "" });
    setAccountState({ loading: false, error: "" });
    setAccountOpen(true);
  }

  function openBusinessEditor() {
    setBusiness({ ...emptyBusiness, ...displayedBusiness });
    setBusinessState({ loading: false, error: "" });
    setBusinessOpen(true);
  }

  function openPasswordEditor() {
    setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordState({ loading: false, error: "" });
    setPasswordOpen(true);
  }

  async function updateAccount(event) {
    event.preventDefault();
    setAccountState({ loading: true, error: "" });
    try {
      const result = await api("/profile", { method: "PUT", body: JSON.stringify(account) });
      setSession(result.token, result.user);
      queryClient.setQueryData(["profile"], result.user);
      setAccountOpen(false);
      setNotice("Profile updated successfully.");
    } catch (error) {
      setAccountState({ loading: false, error: error.message });
    }
  }

  async function updateBusiness(event) {
    event.preventDefault();
    setBusinessState({ loading: true, error: "" });
    try {
      const result = await api("/settings", { method: "PUT", body: JSON.stringify(business) });
      queryClient.setQueryData(["settings"], result);
      setBusinessOpen(false);
      setNotice("Business details updated successfully.");
    } catch (error) {
      setBusinessState({ loading: false, error: error.message });
    }
  }

  async function updatePassword(event) {
    event.preventDefault();
    if (password.newPassword !== password.confirmPassword) {
      setPasswordState({ loading: false, error: "New passwords do not match." });
      return;
    }
    setPasswordState({ loading: true, error: "" });
    try {
      const result = await api("/profile/password", { method: "PUT", body: JSON.stringify({ currentPassword: password.currentPassword, newPassword: password.newPassword }) });
      setPasswordOpen(false);
      setNotice(result.message);
    } catch (error) {
      setPasswordState({ loading: false, error: error.message });
    }
  }

  return (
    <>
      <PageHeader title="Profile" description="Your account details and business information." />
      {notice && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      <div className="max-w-3xl space-y-5">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white" aria-hidden="true">{initial}</div>
                <div className="min-w-0"><h2 className="truncate text-lg font-bold text-slate-950">{user?.name || "User"}</h2><p className="truncate text-sm text-slate-500">{user?.email || "No email available"}</p></div>
              </div>
              <Button variant="secondary" onClick={openAccountEditor}><Pencil size={16} />Edit profile</Button>
            </div>
          </div>
          <div className="divide-y divide-slate-100 px-5 sm:px-6">
            <DetailRow icon={UserRound} label="Full name" value={user?.name} />
            <DetailRow icon={Mail} label="Email address" value={user?.email} />
            <DetailRow icon={ShieldCheck} label="Role" value={formatRole(user?.role)} />
          </div>
          <div className="border-t border-slate-100 p-5 sm:px-6"><Button variant="ghost" onClick={openPasswordEditor}><KeyRound size={17} />Change password</Button></div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 className="flex items-center gap-2 font-bold text-slate-950"><Building2 size={19} />Business details</h2><p className="mt-1 text-sm text-slate-500">Used on newly generated invoices.</p></div>
            {canEditBusiness && <Button variant="secondary" onClick={openBusinessEditor} disabled={businessLoading}><Pencil size={16} />Edit business details</Button>}
          </div>
          <div className="divide-y divide-slate-100 px-5 sm:px-6">
            <DetailRow icon={Building2} label="Business name" value={displayedBusiness.businessName} loading={businessLoading} />
            <DetailRow icon={ReceiptText} label="GSTIN" value={displayedBusiness.gstin} loading={businessLoading} />
            <DetailRow icon={Phone} label="Phone" value={displayedBusiness.phone} loading={businessLoading} />
            <DetailRow icon={MapPin} label="State" value={displayedBusiness.state} loading={businessLoading} />
            <DetailRow icon={ReceiptText} label="Invoice prefix" value={displayedBusiness.invoicePrefix} loading={businessLoading} />
            <DetailRow icon={MapPin} label="Business address" value={displayedBusiness.address} loading={businessLoading} multiline />
          </div>
        </Card>
      </div>

      <Modal open={accountOpen} title="Edit profile" onClose={() => setAccountOpen(false)}>
        <form onSubmit={updateAccount} className="space-y-4">
          <Input label="Full name" required minLength={2} maxLength={100} autoComplete="name" value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} />
          <Input label="Email address" type="email" required maxLength={200} autoComplete="email" value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} />
          <ErrorMessage message={accountState.error} />
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setAccountOpen(false)}>Cancel</Button><Button loading={accountState.loading} disabled={accountState.loading}><Save size={17} />Save profile</Button></div>
        </form>
      </Modal>

      <Modal open={businessOpen} title="Edit business details" onClose={() => setBusinessOpen(false)} wide>
        <form onSubmit={updateBusiness} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Business name" required minLength={2} maxLength={120} value={business.businessName} onChange={(event) => setBusiness({ ...business, businessName: event.target.value })} />
            <Input label="GSTIN" maxLength={30} value={business.gstin} onChange={(event) => setBusiness({ ...business, gstin: event.target.value.toUpperCase() })} />
            <Input label="Phone" type="tel" maxLength={30} value={business.phone} onChange={(event) => setBusiness({ ...business, phone: event.target.value })} />
            <Input label="State" maxLength={80} value={business.state} onChange={(event) => setBusiness({ ...business, state: event.target.value })} />
            <Input label="Invoice prefix" required maxLength={12} pattern="[A-Za-z0-9_-]+" hint="Letters, numbers, hyphens and underscores only." value={business.invoicePrefix} onChange={(event) => setBusiness({ ...business, invoicePrefix: event.target.value.toUpperCase() })} />
          </div>
          <Textarea label="Business address" maxLength={500} value={business.address} onChange={(event) => setBusiness({ ...business, address: event.target.value })} />
          <ErrorMessage message={businessState.error} />
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setBusinessOpen(false)}>Cancel</Button><Button loading={businessState.loading} disabled={businessState.loading}><Save size={17} />Save changes</Button></div>
        </form>
      </Modal>

      <Modal open={passwordOpen} title="Change password" onClose={() => setPasswordOpen(false)}>
        <form onSubmit={updatePassword} className="space-y-4">
          <Input label="Current password" type="password" required minLength={6} autoComplete="current-password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} />
          <Input label="New password" type="password" required minLength={8} maxLength={100} autoComplete="new-password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} />
          <Input label="Confirm new password" type="password" required minLength={8} maxLength={100} autoComplete="new-password" value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} />
          <ErrorMessage message={passwordState.error} />
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setPasswordOpen(false)}>Cancel</Button><Button loading={passwordState.loading} disabled={passwordState.loading}><KeyRound size={17} />Update password</Button></div>
        </form>
      </Modal>
    </>
  );
}

function DetailRow({ icon: Icon, label, value, loading, multiline = false }) {
  return <div className="flex items-start justify-between gap-4 py-4 text-sm"><span className="flex shrink-0 items-center gap-2 text-slate-500"><Icon size={17} />{label}</span><span className={`max-w-[65%] text-right font-semibold text-slate-900 ${multiline ? "whitespace-pre-line" : "truncate"}`}>{loading ? "Loading..." : value || "Not configured"}</span></div>;
}

function ErrorMessage({ message }) {
  return message ? <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null;
}

function formatRole(role) {
  if (role === "DISTRIBUTOR" || role === "ADMIN") return "Distributor";
  if (role === "SALESMAN") return "Salesman";
  return role;
}
