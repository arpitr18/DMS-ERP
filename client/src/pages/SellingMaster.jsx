import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, RotateCcw } from "lucide-react";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { Button, Card, EmptyState, PageHeader, Select } from "../components/ui";

export default function SellingMaster() {
  const qc = useQueryClient();
  const [retailerId, setRetailerId] = useState("");
  const [editing, setEditing] = useState({});
  const [importing, setImporting] = useState(false);
  const { data: retailers = [] } = useQuery({
    queryKey: ["retailers"],
    queryFn: () => api("/retailers"),
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["pricing", retailerId],
    queryFn: () => api(`/pricing/${retailerId}`),
    enabled: !!retailerId,
  });
  const save = useMutation({
    mutationFn: ({ productId, rate }) =>
      api(`/pricing/${retailerId}/${productId}`, {
        method: "PUT",
        body: JSON.stringify({ sellingRate: Number(rate) }),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["pricing", retailerId] }),
  });
  const remove = useMutation({
    mutationFn: (productId) =>
      api(`/pricing/${retailerId}/${productId}`, { method: "DELETE" }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["pricing", retailerId] }),
  });
  async function importFile(file) {
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api("/pricing/import/file", { method: "POST", body: fd });
      alert(r.message);
      if (retailerId)
        qc.invalidateQueries({ queryKey: ["pricing", retailerId] });
    } catch (e) {
      const detail = e.data?.errors
        ?.slice(0, 10)
        .map((x) => `Row ${x.row}: ${x.error}`)
        .join("\n");
      alert(`${e.message}${detail ? "\n" + detail : ""}`);
    } finally {
      setImporting(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Selling Master"
        description="Set custom retailer-product prices. Custom rate automatically overrides the product default during billing."
        action={
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50">
            <Upload size={17} />
            {importing ? "Importing..." : "Import Excel"}
            <input
              hidden
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => importFile(e.target.files?.[0])}
            />
          </label>
        }
      />
      <Card className="p-4">
        <div className="max-w-xl">
          <Select
            label="Select retailer"
            value={retailerId}
            onChange={(e) => {
              setRetailerId(e.target.value);
              setEditing({});
            }}
          >
            <option value="">Choose a retailer…</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.market}
              </option>
            ))}
          </Select>
        </div>
      </Card>
      <Card className="mt-4">
        {!retailerId ? (
          <EmptyState
            title="Select a retailer"
            description="Choose a retailer to view and edit its product-specific selling rates."
          />
        ) : !rows.length ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => {
              const value =
                editing[r.productId] ??
                (r.customSellingRate == null
                  ? ""
                  : Number(r.customSellingRate));
              return (
                <div
                  key={r.productId}
                  className="grid gap-3 p-4 sm:grid-cols-[1fr_140px_140px_90px] sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-950">{r.name}</p>
                    <p className="text-xs text-slate-500">
                      {r.code} · MRP {money(r.mrp)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Default</p>
                    <p className="font-medium">{money(r.defaultSellingRate)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">
                      Custom rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Use default"
                      value={value}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [r.productId]: e.target.value,
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="flex gap-2 sm:justify-end">
                    {r.customSellingRate != null && (
                      <button
                        title="Remove custom rate"
                        onClick={() => remove.mutate(r.productId)}
                        className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                    <Button
                      className="min-h-10 px-3"
                      disabled={!value || Number(value) <= 0}
                      onClick={() =>
                        save.mutate({ productId: r.productId, rate: value })
                      }
                    >
                      Save
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
