import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { date, money, today } from "../lib/format";
import { Button, Card, Input, PageHeader, Select } from "../components/ui";
export default function CreateDelivery() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [beat, setBeat] = useState("");
  const [retailer, setRetailer] = useState("");
  const [q, setQ] = useState("");
  const [vehicleId, setVehicle] = useState("");
  const [scheduledDate, setDate] = useState(today());
  const [selected, setSelected] = useState({});
  const [error, setError] = useState("");
  const { data: retailers = [] } = useQuery({
    queryKey: ["retailers"],
    queryFn: () => api("/retailers"),
  });
  const { data: beats = [] } = useQuery({
    queryKey: ["beats"],
    queryFn: () => api("/masters/beats"),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => api("/delivery/vehicles"),
  });
  const params = new URLSearchParams({ market: beat, retailerId: retailer, q });
  const {
    data: bills = [],
    isPending,
    error: loadError,
  } = useQuery({
    queryKey: ["available-delivery-bills", params.toString()],
    queryFn: () => api("/delivery/available-bills?" + params),
  });
  const save = useMutation({
    mutationFn: () =>
      api("/delivery/plans", {
        method: "POST",
        body: JSON.stringify({
          vehicleId,
          scheduledDate,
          invoiceIds: Object.keys(selected),
        }),
      }),
    onSuccess: (plan) => {
      qc.invalidateQueries();
      navigate("/delivery/plans/" + plan.id);
    },
    onError: (e) => {
      setError(e.message);
      qc.invalidateQueries({ queryKey: ["available-delivery-bills"] });
    },
  });
  function toggle(bill) {
    setSelected((previous) => {
      const next = { ...previous };
      if (next[bill.id]) delete next[bill.id];
      else next[bill.id] = bill;
      return next;
    });
  }
  return (
    <>
      <PageHeader
        title="Create Delivery Plan"
        description="Only undelivered bills without an active plan are available."
      />
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Select
            label="Beat"
            value={beat}
            onChange={(e) => {
              setBeat(e.target.value);
              setRetailer("");
            }}
          >
            <option value="">All beats</option>
            {beats.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            label="Outlet / retailer"
            value={retailer}
            onChange={(e) => setRetailer(e.target.value)}
          >
            <option value="">All outlets</option>
            {retailers
              .filter((r) => !beat || r.market === beat)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </Select>
          <Select
            label="Vehicle"
            value={vehicleId}
            onChange={(e) => setVehicle(e.target.value)}
          >
            <option value="">Select vehicle</option>
            {vehicles
              .filter((v) => v.active)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name ? v.name + " · " : ""}
                  {v.number} — {v.driverName}
                </option>
              ))}
          </Select>
          <Input
            label="Delivery date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="mt-4 max-w-md">
          <Input
            label="Search bills"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Invoice or retailer"
          />
        </div>
        <Link
          className="mt-2 inline-block text-sm underline"
          to="/delivery/vehicles"
        >
          Add or manage vehicles
        </Link>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p>
            {Object.keys(selected).length} bills selected ·{" "}
            {money(
              Object.values(selected).reduce(
                (sum, b) => sum + Number(b.grandTotal),
                0,
              ),
            )}
          </p>
          <Button variant="secondary" onClick={() => setSelected({})}>
            Clear selection
          </Button>
        </div>
        {loadError ? (
          <p role="alert" className="p-4 text-red-700">
            {loadError.message}
          </p>
        ) : isPending ? (
          <p className="p-4">Loading bills…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      aria-label="Select all visible bills"
                      checked={
                        bills.length > 0 && bills.every((b) => selected[b.id])
                      }
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelected((old) => {
                          const next = { ...old };
                          for (const b of bills) {
                            if (checked) next[b.id] = b;
                            else delete next[b.id];
                          }
                          return next;
                        });
                      }}
                    />
                  </th>
                  {["Invoice", "Date", "Retailer", "Beat", "Total"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        aria-label={"Select " + b.invoiceNumber}
                        checked={Boolean(selected[b.id])}
                        onChange={() => toggle(b)}
                      />
                    </td>
                    <td>{b.invoiceNumber}</td>
                    <td>{date(b.invoiceDate)}</td>
                    <td>{b.retailerNameSnapshot}</td>
                    <td>{b.retailer.market}</td>
                    <td>{money(b.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!bills.length && (
              <p className="p-5">No available bills match these filters.</p>
            )}
          </div>
        )}
      </Card>
      {Object.keys(selected).length > 0 && (
        <Card className="mt-4 p-4">
          <h2 className="font-semibold">
            Selected bills (including other filters)
          </h2>
          {Object.values(selected).map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-3 py-1 text-sm"
            >
              <span>
                {b.invoiceNumber} — {b.retailerNameSnapshot}
              </span>
              <button className="text-red-600" onClick={() => toggle(b)}>
                Remove
              </button>
            </div>
          ))}
        </Card>
      )}
      {error && (
        <p role="alert" className="mt-3 text-red-700">
          {error}
        </p>
      )}
      <Button
        className="mt-4"
        disabled={
          save.isPending ||
          !vehicleId ||
          !scheduledDate ||
          !Object.keys(selected).length
        }
        onClick={() => save.mutate()}
      >
        Generate
      </Button>
    </>
  );
}
