"use client";

import { createActivityAction } from "@/app/actions";
import {
  CheckCircle2,
  Droplets,
  Leaf,
  Bug,
  NotebookPen,
  Camera,
  Clock,
  Loader2,
  Sprout,
  Tractor,
  CloudRain,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type ActivityRow = {
  id: string;
  type: string;
  occurredAt: string;
  notes: string | null;
  quantity: number | null;
  unit: string | null;
  sector: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  irrigationEvent: { durationMinutes: number; estimatedLiters: number; pressureBar: number | null } | null;
};
type Data = {
  field: { id: string; name: string };
  cycle: { id: string; crop: string };
  user: { id: string; name: string; email: string; active: boolean };
  role: "ADMIN" | "OPERATOR";
  timezone: string;
  today: string;
  currentTime: string;
  sectors: Array<{ id: string; name: string; flowM3h: number }>;
  inventory: Array<{ id: string; name: string; quantityOnHand: number; unit: string }>;
  activities: ActivityRow[];
};
const types = [
  ["Irrigation", "IRRIGATION", Droplets],
  ["Fertilizer", "FERTILIZER_APPLICATION", Leaf],
  ["Pest inspection", "PEST_INSPECTION", Bug],
  ["Field observation", "FIELD_OBSERVATION", NotebookPen],
  ["Planting", "PLANTING", Sprout],
  ["Maintenance", "EQUIPMENT_MAINTENANCE", Tractor],
  ["Rainfall", "RAINFALL_OBSERVATION", CloudRain],
  ["Other", "OTHER", NotebookPen],
] as const;
const allTypes = [
  ["Pesticide application", "PESTICIDE_APPLICATION"],
  ["Herbicide application", "HERBICIDE_APPLICATION"],
  ["Disease inspection", "DISEASE_INSPECTION"],
  ["Weed control", "WEED_CONTROL"],
  ["Soil work", "SOIL_WORK"],
  ["Harvest", "HARVEST"],
] as const;
const initialMap: Record<string, string> = {
  irrigation: "IRRIGATION",
  fertilizer: "FERTILIZER_APPLICATION",
  pest: "PEST_INSPECTION",
  observation: "FIELD_OBSERVATION",
};

export function ActivityLogger({
  data,
  initialType,
  initialSector,
}: {
  data: Data;
  initialType?: string;
  initialSector?: string;
}) {
  const initial =
    initialMap[initialType ?? ""] ?? (types.some(([, v]) => v === initialType) ? initialType : "IRRIGATION");
  const [type, setType] = useState(initial);
  const [sectorId, setSectorId] = useState(
    data.sectors.some((s) => s.id === initialSector) ? initialSector! : (data.sectors[0]?.id ?? ""),
  );
  const [duration, setDuration] = useState(60);
  const [inventoryId, setInventoryId] = useState("");
  const [flow, setFlow] = useState(data.sectors.find((s) => s.id === sectorId)?.flowM3h ?? 11);
  const [saved, setSaved] = useState<{ liters: number | null } | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const router = useRouter();
  const estimated = useMemo(() => Math.round(((flow * duration) / 60) * 1000), [flow, duration]);
  function chooseSector(id: string) {
    setSectorId(id);
    setFlow(data.sectors.find((s) => s.id === id)?.flowM3h ?? 11);
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      type,
      sectorId: type === "IRRIGATION" ? sectorId : String(form.get("sectorId") || "") || undefined,
      cropCycleId: data.cycle.id,
      date: String(form.get("date")),
      startTime: String(form.get("startTime") || "") || undefined,
      endTime: String(form.get("endTime") || "") || undefined,
      quantity: form.get("quantity") ? Number(form.get("quantity")) : undefined,
      unit: String(form.get("unit") || "") || undefined,
      productUsed: String(form.get("productUsed") || "") || undefined,
      inventoryItemId: inventoryId || undefined,
      inventoryQuantity: form.get("inventoryQuantity") ? Number(form.get("inventoryQuantity")) : undefined,
      allowNegativeStock: form.get("allowNegativeStock") === "on",
      worker: String(form.get("worker") || "") || undefined,
      cost: form.get("cost") ? Number(form.get("cost")) : undefined,
      notes: String(form.get("notes") || "") || undefined,
      idempotencyKey: key,
    };
    if (type === "IRRIGATION") {
      payload.durationMinutes = duration;
      payload.flowM3h = flow;
      payload.pressureBar = form.get("pressureBar") ? Number(form.get("pressureBar")) : undefined;
    }
    startTransition(async () => {
      const result = await createActivityAction(payload);
      if (!result.ok) setError(result.error);
      else {
        setSaved({ liters: result.data.estimatedLiters });
        setKey(crypto.randomUUID());
        router.refresh();
      }
    });
  }
  if (saved)
    return (
      <div className="card p-8 text-center">
        <CheckCircle2 className="mx-auto size-14 text-farm-600" />
        <h2 className="mt-4 text-xl font-bold">Activity saved</h2>
        <p className="mt-2 text-sm text-slate-500">
          The database, field timeline, irrigation history, and dashboard are now current.
        </p>
        {saved.liters != null && (
          <p className="mt-3 font-semibold text-blue-700">
            Estimated water: {saved.liters.toLocaleString()} liters
          </p>
        )}
        <button onClick={() => setSaved(null)} className="btn-secondary mt-6">
          Log another activity
        </button>
      </div>
    );
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_310px]">
      <form onSubmit={submit} className="card overflow-hidden">
        <div className="border-b bg-[#fafbf9] p-5">
          <p className="text-sm font-bold">Choose activity</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {types.map(([label, value, Icon]) => (
              <button
                type="button"
                key={value}
                onClick={() => setType(value)}
                className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold ${type === value ? "border-farm-600 bg-farm-50 text-farm-700" : "bg-white text-slate-600"}`}
              >
                <Icon size={21} />
                {label}
              </button>
            ))}
          </div>
          <label className="label mt-4">More activity types</label>
          <select
            value={types.some(([, v]) => v === type) ? "" : type}
            onChange={(e) => e.target.value && setType(e.target.value)}
            className="input"
          >
            <option value="">Choose another type…</option>
            {allTypes.map(([l, v]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {type === "IRRIGATION" && (
          <div className="border-b bg-blue-50 p-5">
            <div className="flex items-center justify-between">
              <span>
                <b className="block text-blue-950">Irrigated now</b>
                <span className="text-sm text-blue-700">Farm time and sector flow are prefilled</span>
              </span>
              <CheckCircle2 className="text-blue-600" />
            </div>
          </div>
        )}
        <div className="space-y-5 p-5 md:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Field</label>
              <div className="input flex items-center bg-slate-50">
                {data.field.name} · {data.cycle.crop}
              </div>
            </div>
            <div>
              <label className="label">Sector</label>
              <select
                name="sectorId"
                className="input"
                value={sectorId}
                onChange={(e) => chooseSector(e.target.value)}
              >
                <option value="">All sectors</option>
                {data.sectors.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input name="date" className="input" type="date" defaultValue={data.today} required />
            </div>
            <div>
              <label className="label">Start time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3.5 text-slate-400" size={16} />
                <input name="startTime" className="input pl-9" type="time" defaultValue={data.currentTime} />
              </div>
            </div>
            {type === "IRRIGATION" && (
              <>
                <div>
                  <label className="label">Duration (minutes)</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min="1"
                    max="1440"
                    required
                  />
                </div>
                <div>
                  <label className="label">Flow rate</label>
                  <div className="flex">
                    <input
                      className="input rounded-r-none"
                      type="number"
                      value={flow}
                      onChange={(e) => setFlow(Number(e.target.value))}
                      step="0.1"
                      min="0.1"
                      required
                    />
                    <span className="flex items-center rounded-r-xl border border-l-0 bg-slate-50 px-3 text-sm">
                      m³/h
                    </span>
                  </div>
                </div>
                <div>
                  <label className="label">Pressure (optional)</label>
                  <div className="flex">
                    <input
                      name="pressureBar"
                      className="input rounded-r-none"
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      placeholder="1.2"
                    />
                    <span className="flex items-center rounded-r-xl border border-l-0 bg-slate-50 px-3 text-sm">
                      bar
                    </span>
                  </div>
                </div>
                <div>
                  <label className="label">Estimated water</label>
                  <div aria-live="polite" className="input flex items-center bg-slate-50 font-semibold">
                    {estimated.toLocaleString()} liters
                  </div>
                </div>
              </>
            )}
            {type !== "IRRIGATION" && (
              <>
                <div>
                  <label className="label">Quantity</label>
                  <input name="quantity" className="input" type="number" min="0" step="0.01" />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <input name="unit" className="input" placeholder="kg, mm, hours…" />
                </div>
                <div>
                  <label className="label">Product used</label>
                  <input name="productUsed" className="input" />
                </div>
                <div>
                  <label className="label">Use inventory item (optional)</label>
                  <select className="input" value={inventoryId} onChange={(e)=>setInventoryId(e.target.value)}>
                    <option value="">No stock adjustment</option>
                    {data.inventory.map(item=><option key={item.id} value={item.id}>{item.name} · {item.quantityOnHand} {item.unit}</option>)}
                  </select>
                </div>
                {inventoryId&&<div><label className="label">Inventory quantity used</label><input name="inventoryQuantity" className="input" type="number" min="0.001" step="0.001" required/>{data.role==="ADMIN"&&<label className="mt-2 flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" name="allowNegativeStock"/>Allow negative stock</label>}</div>}
                <div>
                  <label className="label">Cost (optional)</label>
                  <input name="cost" className="input" type="number" min="0" step="0.01" />
                </div>
              </>
            )}
          </div>
          <input type="hidden" name="worker" value={data.user.name} />
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              name="notes"
              className="input min-h-24 py-3"
              placeholder="Add a field observation…"
              maxLength={2000}
            />
          </div>
          <button type="button" className="btn-secondary w-full border-dashed">
            <Camera size={18} />
            Photos available after saving
          </button>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Recorded by <b>{data.user.name}</b> · Farm timezone: {data.timezone}
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          <button disabled={pending} className="btn-primary w-full">
            {pending && <Loader2 size={18} className="animate-spin" />}
            {pending ? "Saving…" : "Save activity"}
          </button>
        </div>
      </form>
      <aside className="card h-fit p-5">
        <h2 className="font-bold">Recent activity</h2>
        <div className="mt-4 space-y-4">
          {data.activities.slice(0, 6).map((a) => (
            <div key={a.id} className="border-b pb-3 last:border-0">
              <p className="text-sm font-semibold">{a.type.replaceAll("_", " ").toLowerCase()}</p>
              <p className="text-xs text-slate-500">
                {a.sector?.name ?? "All sectors"} ·{" "}
                {new Intl.DateTimeFormat("en-US", {
                  timeZone: data.timezone,
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(a.occurredAt))}
              </p>
              {a.irrigationEvent && (
                <p className="mt-1 text-xs text-blue-700">
                  {a.irrigationEvent.durationMinutes} min ·{" "}
                  {a.irrigationEvent.estimatedLiters.toLocaleString()} L
                </p>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
