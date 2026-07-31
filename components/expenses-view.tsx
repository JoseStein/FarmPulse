"use client";

import { createExpenseAction, deleteExpenseAction } from "@/app/actions";
import { money } from "@/lib/utils";
import { Plus, Receipt, Search, X, CheckCircle2, Download, Loader2, Trash2,Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type ExpenseRow = {
  id: string;
  date: string;
  vendor: string | null;
  description: string;
  category: string;
  amount: number;
  currency: string;
  quantity: number | null;
  unitCost: number | null;
  notes: string | null;
  sector: { id: string; name: string } | null;
  enteredBy: { id: string; name: string };
};
type Data = {
  role: "ADMIN" | "OPERATOR";
  currency: string;
  areaHa: number;
  rows: ExpenseRow[];
  totals: { actual: number; planned: number; remaining: number; variance: number; percentUsed: number };
  byCategory: Array<{ category: string; amount: number }>;
  bySector: Array<{ sectorId: string | null; amount: number }>;
  sectors: Array<{ id: string; name: string }>;
  categories: string[];
};

export function ExpensesView({ data, startNew = false }: { data: Data; startNew?: boolean }) {
  const [open, setOpen] = useState(startNew),
    [editing,setEditing]=useState<ExpenseRow|null>(null),
    [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null),
    [pending, startTransition] = useTransition();
  const router = useRouter(),
    params = useSearchParams();
  const acres = data.areaHa * 2.47105;
  const exportParams = new URLSearchParams(params);
  exportParams.delete("new");
  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("new");
    router.push(`/expenses?${next}`);
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      ...Object.fromEntries(form),
      id:editing?.id,
      amount: Number(form.get("amount")),
      quantity: form.get("quantity") ? Number(form.get("quantity")) : undefined,
      unitCost: form.get("unitCost") ? Number(form.get("unitCost")) : undefined,
      idempotencyKey: crypto.randomUUID(),
    };
    setMessage(null);
    startTransition(async () => {
      const result = await createExpenseAction(payload);
      if (!result.ok) setMessage({ ok: false, text: result.error });
      else {
        setMessage({ ok: true, text: "Expense saved to PostgreSQL." });
        setOpen(false);
        setEditing(null);
        router.refresh();
      }
    });
  }
  function remove(id: string) {
    if (!confirm("Remove this expense from active financial records? The audit history will be retained."))
      return;
    startTransition(async () => {
      const result = await deleteExpenseAction(id);
      setMessage({ ok: result.ok, text: result.ok ? "Expense removed." : result.error });
      router.refresh();
    });
  }
  const max = Math.max(...data.byCategory.map((x) => x.amount), 1);
  return (
    <>
      {message && (
        <div
          role="status"
          className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
        >
          {message.ok && <CheckCircle2 size={17} />} {message.text}
        </div>
      )}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs text-slate-500">Actual cost to date</p>
          <p className="mt-2 text-2xl font-bold">{money(data.totals.actual)}</p>
          <p className="mt-1 text-xs text-farm-700">
            {Math.round(data.totals.percentUsed)}% of planned budget
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-500">Planned budget</p>
          <p className="mt-2 text-2xl font-bold">{money(data.totals.planned)}</p>
          <p className="mt-1 text-xs text-slate-400">Planned value</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-500">Budget remaining</p>
          <p className={`mt-2 text-2xl font-bold ${data.totals.remaining < 0 ? "text-red-700" : ""}`}>
            {money(data.totals.remaining)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Planned less actual</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-500">Cost per hectare / acre</p>
          <p className="mt-2 text-2xl font-bold">{money(data.totals.actual / data.areaHa)}</p>
          <p className="mt-1 text-xs text-slate-400">{money(data.totals.actual / acres)} per acre</p>
        </div>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <select
            value={params.get("category") ?? ""}
            onChange={(e) => setFilter("category", e.target.value)}
            className="input pl-9"
          >
            <option value="">All categories</option>
            {data.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <select
          value={params.get("sector") ?? ""}
          onChange={(e) => setFilter("sector", e.target.value)}
          className="input"
        >
          <option value="">All sectors</option>
          {data.sectors.map((s) => (
            <option value={s.id} key={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          aria-label="From date"
          type="date"
          value={params.get("from") ?? ""}
          onChange={(e) => setFilter("from", e.target.value)}
          className="input"
        />
        <input
          aria-label="To date"
          type="date"
          value={params.get("to") ?? ""}
          onChange={(e) => setFilter("to", e.target.value)}
          className="input"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="font-bold">Actual expense records</h2>
              <p className="text-xs text-slate-500">{data.rows.length} filtered records</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/api/reports/expenses?${exportParams}`} className="btn-secondary">
                <Download size={16} />
                CSV
              </Link>
              {data.role === "ADMIN" && (
                <button onClick={() => {setEditing(null);setOpen(true)}} className="btn-primary">
                  <Plus size={16} />
                  Expense
                </button>
              )}
            </div>
          </div>
          <div className="divide-y">
            {data.rows.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">No expenses match these filters.</div>
            )}
            {data.rows.map((e) => (
              <div className="flex items-center gap-3 p-4" key={e.id}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-farm-50 text-farm-700">
                  <Receipt size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.description}</p>
                  <p className="truncate text-xs text-slate-500">
                    {new Date(e.date).toLocaleDateString()} · {e.vendor || "No vendor"} · {e.category}
                    {e.sector ? ` · ${e.sector.name}` : ""}
                  </p>
                  <p className="text-[11px] text-slate-400">Entered by {e.enteredBy.name}</p>
                </div>
                <p className="font-bold">{money(e.amount)}</p>
                {data.role === "ADMIN" && (
                  <button onClick={()=>{setEditing(e);setOpen(true)}} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-farm-50 hover:text-farm-700" aria-label={`Edit ${e.description}`}><Pencil size={16}/></button>
                )}
                {data.role === "ADMIN" && (
                  <button
                    disabled={pending}
                    onClick={() => remove(e.id)}
                    className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Delete ${e.description}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
        <aside className="card p-5">
          <h2 className="font-bold">Cost by category</h2>
          <div className="mt-5 space-y-4">
            {data.byCategory.map((x) => (
              <div key={x.category}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{x.category}</span>
                  <b>{money(x.amount)}</b>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-farm-600"
                    style={{ width: `${(x.amount / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Actual costs come from active database records. Profitability remains estimated until harvest and
            sale values are recorded.
          </p>
        </aside>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
          onClick={() => setOpen(false)}
        >
          <form
            key={editing?.id??"new"}
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{editing?"Edit expense":"Record expense"}</h2>
                <p className="text-sm text-slate-500">This {editing?"updates":"creates"} an actual {data.currency} cost.</p>
              </div>
              <button
                type="button"
                onClick={() => {setOpen(false);setEditing(null)}}
                className="grid size-10 place-items-center rounded-full bg-slate-100"
              >
                <X />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Date</label>
                <input
                  name="date"
                  type="date"
                  defaultValue={editing?.date.slice(0,10)??new Date().toISOString().slice(0, 10)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Category</label>
                <select name="category" className="input" defaultValue={editing?.category??"Seed"}>
                  {[
                    "Seed",
                    "Fertilizer",
                    "Pesticide",
                    "Herbicide",
                    "Labor",
                    "Irrigation",
                    "Fuel",
                    "Equipment",
                    "Repairs",
                    "Transportation",
                    "Packaging",
                    "Rent",
                    "Utilities",
                    "Other",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <input name="description" defaultValue={editing?.description??""} className="input" required minLength={2} />
              </div>
              <div>
                <label className="label">Vendor</label>
                <input name="vendor" defaultValue={editing?.vendor??""} className="input" />
              </div>
              <div>
                <label className="label">Amount ({data.currency})</label>
                <input name="amount" defaultValue={editing?.amount??""} className="input" type="number" step="0.01" min="0.01" required />
              </div>
              <div>
                <label className="label">Sector</label>
                <select name="sectorId" className="input" defaultValue={editing?.sector?.id??""}>
                  <option value="">All sectors</option>
                  {data.sectors.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input name="quantity" defaultValue={editing?.quantity??""} type="number" min="0.001" step="0.001" className="input" />
              </div>
              <div>
                <label className="label">Unit cost</label>
                <input name="unitCost" defaultValue={editing?.unitCost??""} type="number" min="0" step="0.01" className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notes</label>
                <textarea name="notes" defaultValue={editing?.notes??""} className="input min-h-20 py-3" />
              </div>
            </div>
            {message && !message.ok && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message.text}</p>
            )}
            <button disabled={pending} className="btn-primary mt-6 w-full">
              {pending && <Loader2 size={17} className="animate-spin" />}Save expense
            </button>
          </form>
        </div>
      )}
    </>
  );
}
