"use client";

import { createLandPreparationTasksAction } from "@/app/actions";
import { Status } from "@/components/ui";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  CircleHelp,
  CloudRain,
  FlaskConical,
  ListChecks,
  Loader2,
  MapPinned,
  Sprout,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type CheckStatus = "VERIFIED" | "PLANNED" | "NEEDS_ATTENTION" | "NOT_ASSESSED";
type Data = {
  role: "ADMIN" | "OPERATOR";
  farm: { name: string; locationName: string | null; timezone: string };
  field: { id: string; name: string; areaHa: number };
  cycle: {
    id: string;
    crop: string;
    variety: string | null;
    stage: string;
    plannedPlantingDate: string | null;
    actualPlantingDate: string | null;
    populationTarget: number | null;
    seedQuantityKg: number | null;
  };
  checks: Array<{ id: string; name: string; status: CheckStatus; detail: string; source: string }>;
  summary: {
    total: number;
    knownCount: number;
    verifiedCount: number;
    attentionCount: number;
    unknownCount: number;
    evidenceCoverage: number;
  };
  recommendations: Array<{
    id: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    title: string;
    reason: string;
    evidence: string;
  }>;
  generatedTasks: Array<{
    id: string;
    name: string;
    category: string;
    status: string;
    dueAt: string;
  }>;
  weather: {
    source: string;
    stale: boolean;
    updatedAt: string;
    forecastRain3d: number;
    available: boolean;
  };
};

const checkPresentation: Record<CheckStatus, { label: string; tone: "green" | "blue" | "amber" | "slate"; icon: typeof CheckCircle2 }> = {
  VERIFIED: { label: "Verified", tone: "green", icon: CheckCircle2 },
  PLANNED: { label: "Planned", tone: "blue", icon: ListChecks },
  NEEDS_ATTENTION: { label: "Needs attention", tone: "amber", icon: AlertTriangle },
  NOT_ASSESSED: { label: "Not assessed", tone: "slate", icon: CircleHelp },
};

export function LandPreparationView({ data }: { data: Data }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const plants = data.cycle.populationTarget
    ? Math.round(data.cycle.populationTarget * data.field.areaHa)
    : null;

  function generateTasks() {
    setMessage(null);
    startTransition(async () => {
      const result = await createLandPreparationTasksAction();
      if (!result.ok) setMessage({ ok: false, text: result.error });
      else {
        setMessage({
          ok: true,
          text: result.data.createdCount
            ? `${result.data.createdCount} preparation tasks were added.`
            : "The preparation task plan already exists; no duplicates were created.",
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div className="bg-gradient-to-r from-[#244f38] to-[#34714d] p-5 text-white md:p-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Status tone="blue">Pre-planting</Status>
                <span className="text-xs text-white/70">Rule-based · no invented measurements</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold">Early production setup</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/75">
                FarmPulse is using saved records and live weather now. Unknown physical conditions remain explicitly unassessed until someone can verify them on the land.
              </p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 p-4 text-center">
              <div className="px-3">
                <p className="text-2xl font-bold">{data.summary.verifiedCount}</p>
                <p className="text-xs text-white/65">verified</p>
              </div>
              <div className="px-3">
                <p className="text-2xl font-bold">{data.summary.unknownCount}</p>
                <p className="text-xs text-white/65">unknown</p>
              </div>
              <div className="px-3">
                <p className="text-2xl font-bold">{data.summary.evidenceCoverage}%</p>
                <p className="text-xs text-white/65">coverage</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t bg-amber-50 p-4 text-sm text-amber-900">
          <b>Evidence coverage is not a planting-readiness score.</b> It only shows how much FarmPulse can verify from real records today.
        </div>
      </section>

      {message && (
        <p className={`rounded-xl p-3 text-sm font-semibold ${message.ok ? "bg-farm-50 text-farm-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <section className="card p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-bold">Automatic preparation checks</h2>
              <p className="mt-1 text-sm text-slate-500">Updated from field records, completed work, inventory, equipment, and weather.</p>
            </div>
            <Status tone={data.summary.attentionCount ? "amber" : "green"}>
              {data.summary.attentionCount ? `${data.summary.attentionCount} need attention` : "No recorded blockers"}
            </Status>
          </div>
          <div className="space-y-3">
            {data.checks.map((check) => {
              const presentation = checkPresentation[check.status];
              const Icon = presentation.icon;
              return (
                <div key={check.id} className="rounded-xl border p-4">
                  <div className="flex gap-3">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-600">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{check.name}</p>
                        <Status tone={presentation.tone}>{presentation.label}</Status>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{check.detail}</p>
                      <p className="mt-2 text-xs text-slate-400">Evidence: {check.source}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-farm-50 text-farm-700"><Sprout size={20} /></span>
              <div><h2 className="font-bold">Current crop plan</h2><p className="text-xs text-slate-500">What is known today</p></div>
            </div>
            <dl className="mt-4 divide-y text-sm">
              <div className="flex justify-between gap-3 py-3"><dt className="text-slate-500">Crop</dt><dd className="font-semibold">{data.cycle.crop}</dd></div>
              <div className="flex justify-between gap-3 py-3"><dt className="text-slate-500">Variety</dt><dd className="font-semibold">{data.cycle.variety ?? "Not known"}</dd></div>
              <div className="flex justify-between gap-3 py-3"><dt className="text-slate-500">Field area</dt><dd className="font-semibold">{data.field.areaHa.toFixed(2)} ha</dd></div>
              <div className="flex justify-between gap-3 py-3"><dt className="text-slate-500">Planting date</dt><dd className="font-semibold">{data.cycle.plannedPlantingDate ? new Intl.DateTimeFormat("en-US", { timeZone: data.farm.timezone, dateStyle: "medium" }).format(new Date(data.cycle.plannedPlantingDate)) : "Not set"}</dd></div>
            </dl>
            <Link href="/crop-cycle" className="btn-secondary mt-4 w-full">View crop cycle</Link>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Calculator size={20} /></span>
              <div><h2 className="font-bold">Material calculations</h2><p className="text-xs text-slate-500">Calculated only when inputs are known</p></div>
            </div>
            {plants ? (
              <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
                Current population target implies approximately <b>{plants.toLocaleString()} plants</b> across {data.field.areaHa.toFixed(2)} ha.
              </p>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-slate-500">
                Waiting for confirmed variety, planting method, and spacing. FarmPulse will not guess seed or plant quantities.
              </p>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-700"><CloudRain size={20} /></span>
              <div><h2 className="font-bold">Weather evidence</h2><p className="text-xs text-slate-500">{data.weather.stale ? "Saved forecast" : "Live forecast"}</p></div>
            </div>
            <p className="mt-4 text-2xl font-bold">{data.weather.available ? `${data.weather.forecastRain3d.toFixed(1)} mm` : "Unavailable"}</p>
            <p className="text-xs text-slate-500">forecast rain over the next three days</p>
          </section>
        </div>
      </div>

      <section className="card p-5 md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-700"><WandSparkles size={20} /></span>
          <div><h2 className="font-bold">Smart recommendations</h2><p className="text-sm text-slate-500">Transparent rules based on current evidence—not a trained farm model yet.</p></div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.recommendations.map((recommendation) => (
            <article key={recommendation.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{recommendation.title}</h3>
                <Status tone={recommendation.priority === "HIGH" ? "amber" : recommendation.priority === "MEDIUM" ? "blue" : "green"}>{recommendation.priority.toLowerCase()}</Status>
              </div>
              <p className="mt-2 text-sm text-slate-600">{recommendation.reason}</p>
              <p className="mt-3 text-xs text-slate-400">Basis: {recommendation.evidence}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-farm-50 text-farm-700"><ListChecks size={20} /></span>
            <div>
              <h2 className="font-bold">Preparation work plan</h2>
              <p className="mt-1 text-sm text-slate-500">Generate practical inspection and planning tasks without entering measurements now.</p>
            </div>
          </div>
          {data.role === "ADMIN" && (
            <button onClick={generateTasks} disabled={pending} className="btn-primary shrink-0">
              {pending ? <Loader2 className="animate-spin" size={18} /> : <ListChecks size={18} />}
              {data.generatedTasks.length ? "Check for missing tasks" : "Create preparation tasks"}
            </button>
          )}
        </div>
        {data.generatedTasks.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {data.generatedTasks.map((task) => (
              <Link href="/tasks?view=all" key={task.id} className="rounded-xl border p-4 transition hover:bg-farm-50">
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{task.name.replace("[Land setup] ", "")}</p><Status tone={task.status === "COMPLETED" ? "green" : "blue"}>{task.status.toLowerCase().replaceAll("_", " ")}</Status></div>
                <p className="mt-2 text-xs text-slate-500">{task.category} · due {new Intl.DateTimeFormat("en-US", { timeZone: data.farm.timezone, dateStyle: "medium" }).format(new Date(task.dueAt))}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-slate-500">
            No preparation tasks have been generated. Creating them adds seven editable tasks to the existing task board; it does not create soil, water, or land measurements.
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><MapPinned className="text-farm-700" size={20} /><p className="mt-3 font-semibold">Land observations</p><p className="mt-1 text-sm text-slate-500">Will come from completed inspections and field notes.</p></div>
        <div className="card p-4"><FlaskConical className="text-farm-700" size={20} /><p className="mt-3 font-semibold">Soil intelligence</p><p className="mt-1 text-sm text-slate-500">Will activate after real laboratory results exist.</p></div>
        <div className="card p-4"><Sprout className="text-farm-700" size={20} /><p className="mt-3 font-semibold">Farm learning</p><p className="mt-1 text-sm text-slate-500">Begins as tasks and verified activities accumulate.</p></div>
      </section>
    </div>
  );
}
