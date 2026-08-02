"use client";

import { createActivityAction } from "@/app/actions";
import {
  CheckCircle2,
  Droplets,
  Leaf,
  Bug,
  NotebookPen,
  Camera,
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
  cycle: { id: string; cropId: string; crop: string };
  crops: Array<{ id: string; name: string }>;
  user: { id: string; name: string; email: string; active: boolean };
  role: "ADMIN" | "OPERATOR";
  timezone: string;
  today: string;
  currentTime: string;
  sectors: Array<{ id: string; name: string; flowM3h: number | null }>;
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
type FormConfig = {
  title: string;
  description: string;
  product?: { label: string; placeholder: string; required?: boolean };
  quantity?: { label: string; placeholder?: string; required?: boolean; step?: string };
  units?: readonly string[];
  unitLabel?: string;
  unitPlaceholder?: string;
  inventory?: boolean;
  cost?: boolean;
  endTime?: boolean;
  notesLabel: string;
  notesPlaceholder: string;
};
const activityForms: Record<string, FormConfig> = {
  IRRIGATION: {
    title: "Irrigation details",
    description: "Record the sector, duration, flow, and pressure used.",
    notesLabel: "Irrigation notes (optional)",
    notesPlaceholder: "Leaks, pressure changes, runoff, or other observations…",
  },
  PLANTING: {
    title: "Planting details",
    description: "Choose the crop and record the seed or planting material used.",
    product: { label: "Seed lot or source (optional)", placeholder: "Supplier, lot number, or source" },
    quantity: { label: "Seed or planting-material quantity", required: true },
    units: ["kg", "g", "seeds", "seedlings", "cuttings", "trays"],
    inventory: true,
    cost: true,
    endTime: true,
    notesLabel: "Planting notes (optional)",
    notesPlaceholder: "Spacing, row pattern, soil condition, or planting method…",
  },
  FERTILIZER_APPLICATION: {
    title: "Fertilizer application",
    description: "Record the fertilizer, applied amount, and stock used.",
    product: { label: "Fertilizer or amendment", placeholder: "Product or formulation", required: true },
    quantity: { label: "Amount applied", required: true },
    units: ["kg", "g", "L", "mL", "kg/ha", "L/ha"],
    inventory: true,
    cost: true,
    endTime: true,
    notesLabel: "Application notes (optional)",
    notesPlaceholder: "Application method, rate details, weather, or coverage…",
  },
  PESTICIDE_APPLICATION: {
    title: "Pesticide application",
    description: "Record the treatment product, amount, and application details.",
    product: { label: "Pesticide product", placeholder: "Product or active ingredient", required: true },
    quantity: { label: "Amount applied", required: true },
    units: ["L", "mL", "kg", "g", "L/ha", "kg/ha"],
    inventory: true,
    cost: true,
    endTime: true,
    notesLabel: "Treatment notes (optional)",
    notesPlaceholder: "Target pest, application method, weather, and safety interval…",
  },
  HERBICIDE_APPLICATION: {
    title: "Herbicide application",
    description: "Record the herbicide, application amount, and area treatment details.",
    product: { label: "Herbicide product", placeholder: "Product or active ingredient", required: true },
    quantity: { label: "Amount applied", required: true },
    units: ["L", "mL", "kg", "g", "L/ha", "kg/ha"],
    inventory: true,
    cost: true,
    endTime: true,
    notesLabel: "Treatment notes (optional)",
    notesPlaceholder: "Target weeds, application method, weather, and treated area…",
  },
  PEST_INSPECTION: {
    title: "Pest inspection",
    description: "Identify the pest and estimate how much of the field is affected.",
    product: { label: "Pest observed", placeholder: "For example: aphids or fall armyworm", required: true },
    quantity: { label: "Affected count or area (optional)" },
    units: ["plants", "traps", "count", "% area"],
    notesLabel: "Inspection findings (optional)",
    notesPlaceholder: "Location, severity, life stage, damage, and recommended action…",
  },
  DISEASE_INSPECTION: {
    title: "Disease inspection",
    description: "Record the disease or symptoms and the estimated extent.",
    product: { label: "Disease or symptom observed", placeholder: "Disease name or visible symptoms", required: true },
    quantity: { label: "Affected count or area (optional)" },
    units: ["plants", "count", "% area", "ha"],
    notesLabel: "Inspection findings (optional)",
    notesPlaceholder: "Severity, distribution, photos taken, and recommended action…",
  },
  FIELD_OBSERVATION: {
    title: "Field observation",
    description: "Record a crop, soil, drainage, wildlife, or field-condition observation.",
    product: { label: "Observation topic", placeholder: "For example: crop condition or drainage", required: true },
    notesLabel: "Observation details (optional)",
    notesPlaceholder: "Describe what you saw and where it occurred…",
  },
  EQUIPMENT_MAINTENANCE: {
    title: "Equipment maintenance",
    description: "Identify the equipment and record labor, parts, and cost.",
    product: { label: "Equipment or asset", placeholder: "Pump, tractor, filter, or other asset", required: true },
    quantity: { label: "Labor or downtime (optional)", step: "0.1" },
    units: ["hours", "minutes"],
    inventory: true,
    cost: true,
    endTime: true,
    notesLabel: "Maintenance performed (optional)",
    notesPlaceholder: "Work completed, parts replaced, meter reading, and next service…",
  },
  RAINFALL_OBSERVATION: {
    title: "Rainfall observation",
    description: "Record the measured rainfall at the field.",
    quantity: { label: "Rainfall amount", required: true },
    units: ["mm", "in"],
    notesLabel: "Rainfall notes (optional)",
    notesPlaceholder: "Gauge location, storm duration, flooding, or drainage conditions…",
  },
  WEED_CONTROL: {
    title: "Weed control",
    description: "Record the control method and the area treated.",
    product: { label: "Control method or product", placeholder: "Manual, mechanical, mulch, or product", required: true },
    quantity: { label: "Area treated (optional)" },
    units: ["ha", "m²", "% field"],
    inventory: true,
    cost: true,
    endTime: true,
    notesLabel: "Weed-control notes (optional)",
    notesPlaceholder: "Target weeds, method, crew, and effectiveness…",
  },
  SOIL_WORK: {
    title: "Soil work",
    description: "Record the land-preparation operation and area completed.",
    product: { label: "Soil operation", placeholder: "Tillage, bed forming, leveling, or amendment", required: true },
    quantity: { label: "Area worked (optional)" },
    units: ["ha", "m²", "hours"],
    cost: true,
    endTime: true,
    notesLabel: "Soil-work notes (optional)",
    notesPlaceholder: "Equipment, depth, passes, moisture, or soil condition…",
  },
  HARVEST: {
    title: "Harvest details",
    description: "Record the harvested quantity and grade or batch information.",
    product: { label: "Grade or batch (optional)", placeholder: "Grade, batch, destination, or buyer" },
    quantity: { label: "Harvested quantity", required: true },
    units: ["kg", "t", "lb", "crates", "bags", "units"],
    cost: true,
    endTime: true,
    notesLabel: "Harvest notes (optional)",
    notesPlaceholder: "Quality, losses, crew, destination, or storage details…",
  },
  OTHER: {
    title: "Other activity",
    description: "Name the activity and record only the measurements that apply.",
    product: { label: "Activity name", placeholder: "What work or event occurred?", required: true },
    quantity: { label: "Quantity (optional)" },
    unitLabel: "Unit (optional)",
    unitPlaceholder: "kg, hours, units…",
    cost: true,
    endTime: true,
    notesLabel: "Activity details (optional)",
    notesPlaceholder: "Add any details needed to understand this activity…",
  },
};
const initialMap: Record<string, string> = {
  irrigation: "IRRIGATION",
  fertilizer: "FERTILIZER_APPLICATION",
  pest: "PEST_INSPECTION",
  observation: "FIELD_OBSERVATION",
};
const activityValues = new Set<string>([...types, ...allTypes].map(([, value]) => value));

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
    initialMap[initialType ?? ""] ?? (activityValues.has(initialType ?? "") ? initialType : "IRRIGATION");
  const [type, setType] = useState(initial);
  const [sectorId, setSectorId] = useState(
    data.sectors.some((s) => s.id === initialSector) ? initialSector! : (data.sectors[0]?.id ?? ""),
  );
  const [duration, setDuration] = useState(60);
  const [inventoryId, setInventoryId] = useState("");
  const [plantingCrop, setPlantingCrop] = useState(data.cycle.cropId);
  const [flow, setFlow] = useState<number | "">(data.sectors.find((s) => s.id === sectorId)?.flowM3h ?? "");
  const [saved, setSaved] = useState<{ liters: number | null } | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const router = useRouter();
  const formConfig = activityForms[type] ?? activityForms.OTHER;
  const estimated = useMemo(() => flow === "" ? null : Math.round(((flow * duration) / 60) * 1000), [flow, duration]);
  function chooseSector(id: string) {
    setSectorId(id);
    setFlow(data.sectors.find((s) => s.id === id)?.flowM3h ?? "");
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      type,
      sectorId: type === "IRRIGATION" ? sectorId : String(form.get("sectorId") || "") || undefined,
      cropCycleId: data.cycle.id,
      plantingCropId: type === "PLANTING" && plantingCrop !== "new" ? plantingCrop : undefined,
      plantingCropName:
        type === "PLANTING" && plantingCrop === "new"
          ? String(form.get("plantingCropName") || "") || undefined
          : undefined,
      plantingVariety:
        type === "PLANTING" ? String(form.get("plantingVariety") || "") || undefined : undefined,
      date: String(form.get("date")),
      startTime: String(form.get("startTime") || "") || undefined,
      endTime: String(form.get("endTime") || "") || undefined,
      quantity: form.get("quantity") ? Number(form.get("quantity")) : undefined,
      unit: String(form.get("unit") || "") || undefined,
      productUsed: String(form.get("productUsed") || "") || undefined,
      inventoryItemId: formConfig.inventory && inventoryId ? inventoryId : undefined,
      inventoryQuantity: form.get("inventoryQuantity") ? Number(form.get("inventoryQuantity")) : undefined,
      allowNegativeStock: form.get("allowNegativeStock") === "on",
      worker: String(form.get("worker") || "") || undefined,
      cost: form.get("cost") ? Number(form.get("cost")) : undefined,
      notes: String(form.get("notes") || "") || undefined,
      idempotencyKey: key,
    };
    if (type === "IRRIGATION") {
      payload.durationMinutes = duration;
      payload.flowM3h = flow === "" ? undefined : flow;
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
  function chooseType(value: string) {
    setType(value);
    setInventoryId("");
    setError("");
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
                onClick={() => chooseType(value)}
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
            onChange={(e) => e.target.value && chooseType(e.target.value)}
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
            <div className="rounded-xl border border-farm-100 bg-farm-50 p-4 sm:col-span-2">
              <p className="font-semibold text-farm-900">{formConfig.title}</p>
              <p className="mt-1 text-sm text-farm-700">{formConfig.description}</p>
            </div>
            <div className="min-w-0">
              <label className="label">Field</label>
              <div className="input flex items-center bg-slate-50">
                {data.field.name}
              </div>
            </div>
            <div className="min-w-0">
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
            {type === "PLANTING" && (
              <>
                <div className="min-w-0 sm:col-span-2">
                  <label className="label">Crop being planted</label>
                  <select
                    className="input"
                    value={plantingCrop}
                    onChange={(event) => setPlantingCrop(event.target.value)}
                    required
                  >
                    {data.crops.map((crop) => (
                      <option value={crop.id} key={crop.id}>
                        {crop.name}{crop.id === data.cycle.cropId ? " (currently planned)" : ""}
                      </option>
                    ))}
                    <option value="new">Add another crop…</option>
                  </select>
                </div>
                {plantingCrop === "new" && (
                  <div className="min-w-0 sm:col-span-2">
                    <label className="label">New crop name</label>
                    <input
                      name="plantingCropName"
                      className="input"
                      placeholder="For example: tomato, plantain, watermelon"
                      minLength={2}
                      maxLength={120}
                      required
                    />
                  </div>
                )}
                <div className="min-w-0 sm:col-span-2">
                  <label className="label">Variety (optional)</label>
                  <input
                    name="plantingVariety"
                    className="input"
                    placeholder="Cultivar or variety name"
                    maxLength={120}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Saving this planting makes the selected crop the active crop for {data.field.name}.
                  </p>
                </div>
              </>
            )}
            <div className="min-w-0">
              <label className="label">Date</label>
              <input name="date" className="input" type="date" defaultValue={data.today} required />
            </div>
            <div className="min-w-0">
              <label className="label">Start time</label>
              <input name="startTime" className="input" type="time" defaultValue={data.currentTime} />
            </div>
            {formConfig.endTime && (
              <div className="min-w-0">
                <label className="label">End time (optional)</label>
                <input name="endTime" className="input" type="time" />
              </div>
            )}
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
                      onChange={(e) => setFlow(e.target.value ? Number(e.target.value) : "")}
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
                    {estimated == null ? "Enter measured flow" : `${estimated.toLocaleString()} liters`}
                  </div>
                </div>
              </>
            )}
            {type !== "IRRIGATION" && (
              <>
                {formConfig.product && (
                  <div className="min-w-0 sm:col-span-2">
                    <label className="label">{formConfig.product.label}</label>
                    <input
                      name="productUsed"
                      className="input"
                      placeholder={formConfig.product.placeholder}
                      required={formConfig.product.required}
                      maxLength={160}
                    />
                  </div>
                )}
                {formConfig.quantity && (
                  <div className="min-w-0">
                    <label className="label">{formConfig.quantity.label}</label>
                    <input
                      name="quantity"
                      className="input"
                      type="number"
                      min="0"
                      step={formConfig.quantity.step ?? "0.01"}
                      placeholder={formConfig.quantity.placeholder}
                      required={formConfig.quantity.required}
                    />
                  </div>
                )}
                {formConfig.quantity && formConfig.units && (
                  <div className="min-w-0">
                    <label className="label">{formConfig.unitLabel ?? "Unit"}</label>
                    <select name="unit" className="input" required={formConfig.quantity.required}>
                      {!formConfig.quantity.required && <option value="">Choose a unit…</option>}
                      {formConfig.units.map((unit) => (
                        <option value={unit} key={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                )}
                {formConfig.quantity && !formConfig.units && (
                  <div className="min-w-0">
                    <label className="label">{formConfig.unitLabel ?? "Unit"}</label>
                    <input
                      name="unit"
                      className="input"
                      placeholder={formConfig.unitPlaceholder}
                      required={formConfig.quantity.required}
                      maxLength={40}
                    />
                  </div>
                )}
                {formConfig.inventory && (
                  <div className="min-w-0 sm:col-span-2">
                    <label className="label">
                      {type === "EQUIPMENT_MAINTENANCE"
                        ? "Part or supply from inventory (optional)"
                        : "Use inventory item (optional)"}
                    </label>
                    <select
                      className="input"
                      value={inventoryId}
                      onChange={(event) => setInventoryId(event.target.value)}
                    >
                      <option value="">No stock adjustment</option>
                      {data.inventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.quantityOnHand} {item.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {formConfig.inventory && inventoryId && (
                  <div className="min-w-0">
                    <label className="label">Inventory quantity used</label>
                    <input
                      name="inventoryQuantity"
                      className="input"
                      type="number"
                      min="0.001"
                      step="0.001"
                      required
                    />
                    {data.role === "ADMIN" && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <input type="checkbox" name="allowNegativeStock" />
                        Allow negative stock
                      </label>
                    )}
                  </div>
                )}
                {formConfig.cost && (
                  <div className="min-w-0">
                    <label className="label">Cost (optional)</label>
                    <input name="cost" className="input" type="number" min="0" step="0.01" />
                  </div>
                )}
              </>
            )}
          </div>
          <input type="hidden" name="worker" value={data.user.name} />
          <div>
            <label className="label">{formConfig.notesLabel}</label>
            <textarea
              name="notes"
              className="input min-h-24 py-3"
              placeholder={formConfig.notesPlaceholder}
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
