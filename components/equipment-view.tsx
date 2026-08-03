"use client";
import { addMaintenanceAction, saveEquipmentAction } from "@/app/actions";
import { Plus, Tractor, Wrench, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Status } from "./ui";
type RecordRow = {
  id: string;
  performedAt: string;
  description: string;
  cost: number | null;
  runtimeHours: number | null;
};
type Item = {
  id: string;
  name: string;
  type: string;
  status: string;
  manufacturer: string | null;
  model: string | null;
  runtimeHours: number | null;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  notes: string | null;
  maintenanceRecords: RecordRow[];
};
export function EquipmentView({ data }: { data: { role: "ADMIN" | "OPERATOR"; items: Item[] } }) {
  const [edit, setEdit] = useState<Item | "new" | null>(null),
    [maintain, setMaintain] = useState<Item | null>(null),
    [message, setMessage] = useState(""),
    [pending, startTransition] = useTransition();
  const router = useRouter();
  const due = data.items.filter((i) => i.nextMaintenance && new Date(i.nextMaintenance) <= new Date()).length;
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveEquipmentAction({
        ...Object.fromEntries(f),
        id: edit !== "new" ? edit?.id : undefined,
        runtimeHours: f.get("runtimeHours") ? Number(f.get("runtimeHours")) : undefined,
      });
      setMessage(result.ok ? "Equipment saved." : result.error);
      if (result.ok) {
        setEdit(null);
        router.refresh();
      }
    });
  }
  function maintenance(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addMaintenanceAction({
        ...Object.fromEntries(f),
        equipmentId: maintain!.id,
        cost: f.get("cost") ? Number(f.get("cost")) : undefined,
        runtimeHours: f.get("runtimeHours") ? Number(f.get("runtimeHours")) : undefined,
      });
      setMessage(result.ok ? "Maintenance record and activity saved." : result.error);
      if (result.ok) {
        setMaintain(null);
        router.refresh();
      }
    });
  }
  return (
    <>
      {message && (
        <p className="mb-4 rounded-xl bg-farm-50 p-3 text-sm font-semibold text-farm-700">{message}</p>
      )}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs text-slate-500">Active assets</p>
          <p className="mt-2 text-2xl font-bold">{data.items.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-500">Maintenance due</p>
          <p className="mt-2 text-2xl font-bold">{due}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-500">Recorded runtime</p>
          <p className="mt-2 text-2xl font-bold">
            {data.items.reduce((n, i) => n + (i.runtimeHours ?? 0), 0).toFixed(1)} h
          </p>
        </div>
      </div>
      <div className="mb-4 flex justify-end">
        {data.role === "ADMIN" && (
          <button onClick={() => setEdit("new")} className="btn-primary">
            <Plus size={17} />
            Add equipment
          </button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {data.items.map((i) => {
          const overdue = Boolean(i.nextMaintenance && new Date(i.nextMaintenance) < new Date());
          return (
            <article className="card p-5" key={i.id}>
              <div className="flex justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-farm-50 text-farm-700">
                  <Tractor size={21} />
                </span>
                <Status tone={overdue ? "amber" : "green"}>{overdue ? "Maintenance due" : i.status}</Status>
              </div>
              <h2 className="mt-4 font-bold">{i.name}</h2>
              <p className="text-sm text-slate-500">
                {i.type}
                {i.model ? ` · ${i.model}` : ""}
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Runtime</dt>
                  <dd className="font-semibold">{i.runtimeHours ?? 0} h</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Last service</dt>
                  <dd className="font-semibold">
                    {i.lastMaintenance ? new Date(i.lastMaintenance).toLocaleDateString() : "No record"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Next service</dt>
                  <dd className="font-semibold">
                    {i.nextMaintenance ? new Date(i.nextMaintenance).toLocaleDateString() : "Not scheduled"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setMaintain(i)} className="btn-secondary flex-1">
                  <Wrench size={16} />
                  Maintenance
                </button>
                {data.role === "ADMIN" && (
                  <button onClick={() => setEdit(i)} className="btn-secondary">
                    Edit
                  </button>
                )}
              </div>
              {i.maintenanceRecords[0] && (
                <p className="mt-3 text-xs text-slate-400">Latest: {i.maintenanceRecords[0].description}</p>
              )}
            </article>
          );
        })}
        {data.items.length === 0 && (
          <div className="card p-8 text-center sm:col-span-2">
            <Tractor className="mx-auto text-slate-300" />
            <p className="mt-3 font-semibold">No owned or installed equipment yet</p>
            <p className="text-sm text-slate-500">
              Add equipment after purchase or installation. Track planned purchases as tasks.
            </p>
          </div>
        )}
      </div>
      {edit && <EquipmentForm item={edit} pending={pending} onClose={() => setEdit(null)} onSubmit={save} />}{" "}
      {maintain && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
          onClick={() => setMaintain(null)}
        >
          <form
            onSubmit={maintenance}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl"
          >
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-bold">Complete maintenance</h2>
                <p className="text-sm text-slate-500">{maintain.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setMaintain(null)}
                className="grid size-11 place-items-center rounded-full bg-slate-100"
              >
                <X />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Performed date</label>
                <input
                  name="performedAt"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Runtime hours</label>
                <input
                  name="runtimeHours"
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={maintain.runtimeHours ?? 0}
                  className="input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Work completed</label>
                <input name="description" className="input" required />
              </div>
              <div>
                <label className="label">Cost</label>
                <input name="cost" type="number" step="0.01" min="0" className="input" />
              </div>
              <div>
                <label className="label">Next maintenance</label>
                <input name="nextMaintenance" type="date" className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notes</label>
                <textarea name="notes" className="input min-h-20 py-3" />
              </div>
            </div>
            <button disabled={pending} className="btn-primary mt-5 w-full">
              Save maintenance
            </button>
          </form>
        </div>
      )}
    </>
  );
}
function EquipmentForm({
  item,
  pending,
  onClose,
  onSubmit,
}: {
  item: Item | "new";
  pending: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl"
      >
        <div className="flex justify-between">
          <h2 className="text-xl font-bold">{item === "new" ? "Add equipment" : "Edit equipment"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full bg-slate-100"
          >
            <X />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" defaultValue={item === "new" ? "" : item.name} className="input" required />
          </div>
          <div>
            <label className="label">Type</label>
            <input name="type" defaultValue={item === "new" ? "" : item.type} className="input" required />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              name="status"
              defaultValue={item === "new" ? "Operational" : item.status}
              className="input"
            >
              <option>Operational</option>
              <option>Needs attention</option>
              <option>Out of service</option>
            </select>
          </div>
          <div>
            <label className="label">Manufacturer</label>
            <input
              name="manufacturer"
              defaultValue={item === "new" ? "" : (item.manufacturer ?? "")}
              className="input"
            />
          </div>
          <div>
            <label className="label">Model</label>
            <input name="model" defaultValue={item === "new" ? "" : (item.model ?? "")} className="input" />
          </div>
          <div>
            <label className="label">Runtime hours</label>
            <input
              name="runtimeHours"
              type="number"
              min="0"
              step="0.1"
              defaultValue={item === "new" ? 0 : (item.runtimeHours ?? 0)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Next maintenance</label>
            <input
              name="nextMaintenance"
              type="date"
              defaultValue={item === "new" ? "" : (item.nextMaintenance?.slice(0, 10) ?? "")}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea
              name="notes"
              defaultValue={item === "new" ? "" : (item.notes ?? "")}
              className="input min-h-20 py-3"
            />
          </div>
        </div>
        <button disabled={pending} className="btn-primary mt-5 w-full">
          {pending && <Loader2 className="animate-spin" size={17} />}Save equipment
        </button>
      </form>
    </div>
  );
}
