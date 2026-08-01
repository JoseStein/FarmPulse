import Link from "next/link";
import { PageHeader, Status } from "@/components/ui";
import { getSectorSummaries } from "@/lib/data/queries";
import { CloudRain, Droplets, Gauge, Info, Plus } from "lucide-react";
import {barToPsi,cubicMetersHourToGpm,litersToGallons,millimetersToInches,metersToFeet} from "@/lib/utils";

export const metadata = { title: "Irrigation" };

export default async function IrrigationPage() {
  const data = await getSectorSummaries();
  const design = data.design;
  const flow = Number(design.sectorFlowM3h ?? 11);
  const usUnits=data.farm.unitSystem==="US";const water=(v:number)=>`${Math.round(usUnits?litersToGallons(v):v).toLocaleString()} ${usUnits?"gal":"L"}`;const rain=(v:number)=>`${(usUnits?millimetersToInches(v):v).toFixed(usUnits?2:1)} ${usUnits?"in":"mm"}`;
  const target = Array.isArray(design.targetPressureBar) ? design.targetPressureBar : [1, 1.5];
  const priority =
    data.sectors.find((s) => s.recommendation.type === "SKIP_RAIN") ??
    data.sectors.find((s) => s.recommendation.type === "IRRIGATE_TODAY") ??
    data.sectors[0];
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <PageHeader
        eyebrow="Water management"
        title="Irrigation"
        description={`${data.sectors.length} sectors · design flow ${usUnits?`${cubicMetersHourToGpm(flow).toFixed(1)} gpm`:`${flow} m³/h`} per sector · target pressure ${usUnits?target.map(x=>barToPsi(Number(x)).toFixed(1)).join("–")+" psi":target.join("–")+" bar"}`}
        action={data.cycle.planted ?
          <Link href="/activities?type=irrigation" className="btn-primary">
            <Plus size={17} />
            Log irrigation
          </Link> : <span className="btn-secondary cursor-not-allowed opacity-60">Available after planting</span>
        }
      />
      {priority && (
        <section className="card mb-5 border-l-4 border-l-blue-500 p-5">
          <div className="flex gap-3">
            <CloudRain className="shrink-0 text-blue-600" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold">
                  {priority.name}: {priority.recommendation.title}
                </h2>
                <Status tone="blue">Decision support</Status>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {priority.recommendation.reason} {priority.recommendation.action}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>
                  Since irrigation:{" "}
                  <b>
                    {priority.recommendation.dataUsed.hoursSinceIrrigation >= 900
                      ? "No record"
                      : `${priority.recommendation.dataUsed.hoursSinceIrrigation} h`}
                  </b>
                </span>
                <span>
                  Recent rain: <b>{rain(priority.recommendation.dataUsed.rainLast24Mm)}</b>
                </span>
                <span>
                  Forecast: <b>{rain(priority.recommendation.dataUsed.forecastRain24Mm)}</b>
                </span>
                <span>
                  Stage: <b>{priority.recommendation.dataUsed.cropStage}</b>
                </span>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                Generated{" "}
                {new Intl.DateTimeFormat("en-US", {
                  timeZone: data.farm.timezone,
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(priority.recommendation.generatedAt))}
                . Decision support only—not agronomic certainty.
              </p>
            </div>
          </div>
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.sectors.map((s) => (
          <article className="card p-5" key={s.id}>
            <div className="flex items-start justify-between">
              <span
                className={`grid size-10 place-items-center rounded-xl ${s.status === "Irrigation due" ? "bg-blue-50 text-blue-600" : s.status === "Healthy" ? "bg-farm-50 text-farm-700" : "bg-amber-50 text-amber-700"}`}
              >
                <Droplets size={20} />
              </span>
              <Status
                tone={s.status === "Irrigation due" ? "blue" : s.status === "Healthy" ? "green" : "amber"}
              >
                {s.status}
              </Status>
            </div>
            <h2 className="mt-4 text-lg font-bold">{s.name}</h2>
            <p className="text-xs text-slate-500">
              {s.dripLines} drip lines · {s.irrigationEventCount} cycle events
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Last irrigation</dt>
                <dd className="text-right font-semibold">
                  {s.lastIrrigation
                    ? new Intl.DateTimeFormat("en-US", {
                        timeZone: data.farm.timezone,
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(s.lastIrrigation.startedAt))
                    : "No record"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Latest duration</dt>
                <dd className="font-semibold">
                  {s.lastIrrigation ? `${s.lastIrrigation.durationMinutes} min` : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Latest water</dt>
                <dd className="font-semibold">
                  {s.lastIrrigation
                    ? water(s.lastIrrigation.estimatedLiters)
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Cycle total</dt>
                <dd className="font-semibold">{water(s.totalEstimatedLiters)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Open irrigation issues</dt>
                <dd className="font-semibold">{s.openIrrigationIssues}</dd>
              </div>
            </dl>
            {data.cycle.planted ? <Link href={`/activities?type=irrigation&sector=${s.id}`} className="btn-secondary mt-5 w-full">Log now</Link> : <span className="btn-secondary mt-5 w-full cursor-not-allowed opacity-60">Not planted yet</span>}
          </article>
        ))}
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Gauge size={19} />
            System design reference
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Drip tape</dt>
              <dd className="font-semibold">{String(design.dripTapeMm ?? 16)} mm</dd>
            </div>
            <div>
              <dt className="text-slate-500">Emitters</dt>
              <dd className="font-semibold">every ~{usUnits?metersToFeet(Number(design.emitterSpacingM??0.3)).toFixed(2)+" ft":String(design.emitterSpacingM ?? 0.3)+" m"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Storage tank</dt>
              <dd className="font-semibold">
                {water(Number(design.storageTankLiters ?? 24000))}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Target pressure</dt>
              <dd className="font-semibold">{usUnits?target.map(x=>barToPsi(Number(x)).toFixed(1)).join("–")+" psi":target.join("–")+" bar"}</dd>
            </div>
          </dl>
        </section>
        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Info size={19} />
            How recommendations work
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            FarmPulse combines time since the latest saved irrigation, recorded rainfall, forecast
            precipitation, crop stage, and open irrigation issues. It always explains the rule and leaves the
            final decision to the field team.
          </p>
        </section>
      </div>
    </div>
  );
}
