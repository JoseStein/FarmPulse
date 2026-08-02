"use client";
import { updateCropCycleAction } from "@/app/actions";
import { Calendar, Loader2, Sprout, Target, Wheat, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Status } from "./ui";
type Cycle = {
  id: string;
  crop: { id: string; name: string };
  growthStage: { id: string; name: string; order: number } | null;
  variety: string | null;
  actualPlantingDate: string | null;
  expectedHarvestDate: string | null;
  actualHarvestDate: string | null;
  populationTarget: number | null;
  expectedYieldKg: number | null;
  actualYieldKg: number | null;
  status: string;
};
export function CropCycleView({
  data,
}: {
  data: {
    cycle: Cycle;
    stages: Array<{ id: string; name: string; order: number }>;
    crops: Array<{ id: string; name: string }>;
    role: "ADMIN" | "OPERATOR";
    timezone: string;
    now: string;
    field: { name: string; areaHa: number };
  };
}) {
  const [open, setOpen] = useState(false),
    [message, setMessage] = useState(""),
    [pending, startTransition] = useTransition();
  const [planningCrop, setPlanningCrop] = useState(
    data.crops.some((crop) => crop.id === data.cycle.crop.id) ? data.cycle.crop.id : "",
  );
  const router = useRouter();
  const planting = data.cycle.actualPlantingDate;
  const age = planting ? Math.max(0, Math.floor((new Date(data.now).getTime() - new Date(planting).getTime()) / 864e5)) : null;
  const progress = data.cycle.growthStage
    ? Math.round(((data.cycle.growthStage.order + 1) / data.stages.length) * 100)
    : 0;
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCropCycleAction({
        ...Object.fromEntries(f),
        planningCropId: planningCrop === "new" ? undefined : planningCrop,
        populationTarget: f.get("populationTarget") ? Number(f.get("populationTarget")) : null,
        expectedYieldKg: f.get("expectedYieldKg") ? Number(f.get("expectedYieldKg")) : null,
        actualYieldKg: f.get("actualYieldKg") ? Number(f.get("actualYieldKg")) : null,
      });
      setMessage(result.ok ? "Crop cycle updated." : result.error);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }
  return (
    <>
      {message && (
        <p className="mb-4 rounded-xl bg-farm-50 p-3 text-sm font-semibold text-farm-700">{message}</p>
      )}
      <section className="card bg-farm-900 p-6 text-white">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Status>{data.cycle.status.toLowerCase()}</Status>
            <h2 className="mt-3 text-2xl font-bold">{data.cycle.growthStage?.name ?? "Stage not set"}</h2>
            <p className="mt-1 text-sm text-white/70">
              {age == null ? "Planting date not recorded" : `Day ${age} of the crop cycle`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Sprout className="size-20 text-[#e6d57c]" />
            {data.role === "ADMIN" && (
              <button onClick={() => setOpen(true)} className="btn-secondary">
                Update cycle
              </button>
            )}
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-[#e6d57c]" style={{ width: `${progress}%` }} />
        </div>
      </section>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <Calendar className="text-farm-600" />
          <p className="mt-3 text-xs text-slate-500">Actual planting</p>
          <p className="font-bold">
            {planting
              ? new Intl.DateTimeFormat("en-US", { timeZone: data.timezone, dateStyle: "long" }).format(
                  new Date(planting),
                )
              : "Not recorded"}
          </p>
        </div>
        <div className="card p-5">
          <Wheat className="text-farm-600" />
          <p className="mt-3 text-xs text-slate-500">Expected harvest</p>
          <p className="font-bold">
            {data.cycle.expectedHarvestDate
              ? new Intl.DateTimeFormat("en-US", { timeZone: data.timezone, dateStyle: "long" }).format(
                  new Date(data.cycle.expectedHarvestDate),
                )
              : "Not recorded"}
          </p>
        </div>
        <div className="card p-5">
          <Target className="text-farm-600" />
          <p className="mt-3 text-xs text-slate-500">Population target</p>
          <p className="font-bold">
            {data.cycle.populationTarget?.toLocaleString() ?? "Not recorded"} plants
          </p>
        </div>
      </div>
      <section className="card mt-5 p-5">
        <h2 className="font-bold">Growth stages</h2>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.stages.map((s, i) => (
            <div
              key={s.id}
              className={`rounded-xl border p-3 text-sm ${data.cycle.growthStage && s.order <= data.cycle.growthStage.order ? "border-farm-200 bg-farm-50" : "bg-white text-slate-500"}`}
            >
              <span className="text-xs font-bold text-slate-400">{i + 1}</span>
              <p className="mt-1 font-semibold">{s.name}</p>
            </div>
          ))}
        </div>
      </section>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 text-ink sm:rounded-3xl"
          >
            <div className="flex justify-between">
              <h2 className="text-xl font-bold">Update crop cycle</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-full bg-slate-100"
              >
                <X />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Planned crop</label>
                <select
                  name="planningCropId"
                  value={planningCrop}
                  onChange={(event) => setPlanningCrop(event.target.value)}
                  className="input"
                  required
                >
                  <option value="" disabled>Choose a crop…</option>
                  {data.crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.name}</option>)}
                  <option value="new">Add another crop…</option>
                </select>
              </div>
              {planningCrop === "new" && (
                <div className="sm:col-span-2">
                  <label className="label">New crop name</label>
                  <input name="planningCropName" className="input" minLength={2} maxLength={120} required placeholder="For example: tomato, plantain, watermelon" />
                </div>
              )}
              <div>
                <label className="label">Variety</label>
                <input name="variety" defaultValue={data.cycle.variety ?? ""} className="input" />
              </div>
              {planningCrop === data.cycle.crop.id ? <div>
                <label className="label">Growth stage</label>
                <select
                  name="growthStageId"
                  defaultValue={data.cycle.growthStage?.id ?? ""}
                  className="input"
                >
                  {data.stages.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div> : <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">The growth stage will start at Planning when this crop is selected.</div>}
              <div>
                <label className="label">Actual planting</label>
                <input
                  name="actualPlantingDate"
                  type="date"
                  defaultValue={data.cycle.actualPlantingDate?.slice(0, 10) ?? ""}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Expected harvest</label>
                <input
                  name="expectedHarvestDate"
                  type="date"
                  defaultValue={data.cycle.expectedHarvestDate?.slice(0, 10) ?? ""}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Population target</label>
                <input
                  name="populationTarget"
                  type="number"
                  min="1"
                  defaultValue={data.cycle.populationTarget ?? ""}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Expected yield (kg)</label>
                <input
                  name="expectedYieldKg"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={data.cycle.expectedYieldKg ?? ""}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Actual harvest</label>
                <input
                  name="actualHarvestDate"
                  type="date"
                  defaultValue={data.cycle.actualHarvestDate?.slice(0, 10) ?? ""}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Actual yield (kg)</label>
                <input
                  name="actualYieldKg"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={data.cycle.actualYieldKg ?? ""}
                  className="input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Status</label>
                <select name="status" defaultValue={data.cycle.status} className="input">
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
            <button disabled={pending} className="btn-primary mt-5 w-full">
              {pending && <Loader2 className="animate-spin" size={17} />}Save crop cycle
            </button>
          </form>
        </div>
      )}
    </>
  );
}
