import Link from "next/link";
import { PageHeader, Status } from "@/components/ui";
import { getDashboardSummary, getSectorSummaries } from "@/lib/data/queries";
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CloudRain,
  Droplets,
  Leaf,
  NotebookPen,
  Package,
  Plus,
  Sprout,
  Sun,
  Wrench,
} from "lucide-react";
import { hectaresToAcres, litersToGallons, money } from "@/lib/utils";
import { getFarmWeather } from "@/lib/weather";

export const metadata = { title: "Today" };
const quick = [
  ["Log irrigation", Droplets, "/activities?type=irrigation"],
  ["Complete task", CheckCircle2, "/tasks"],
  ["Add field note", NotebookPen, "/journal?new=1"],
  ["Record expense", CircleDollarSign, "/expenses?new=1"],
  ["Record fertilizer", Leaf, "/activities?type=fertilizer"],
  ["Pest inspection", Bug, "/activities?type=pest"],
  ["Upload photo", Plus, "/journal?new=1"],
  ["Report issue", AlertTriangle, "/journal?issue=1"],
] as const;

export default async function Dashboard() {
  await getFarmWeather();
  const [data, sectors] = await Promise.all([getDashboardSummary(), getSectorSummaries()]);
  const recommendation =
    sectors.sectors.find((s) => s.recommendation.type !== "MONITOR") ?? sectors.sectors[0];
  const weatherPayload = (data.weather?.payload ?? {}) as Record<string, unknown>;
  const rainProbability = Number(data.weather?.rainProbability ?? weatherPayload.rainProbability ?? 0);
  const usUnits=data.farm.unitSystem==="US";
  const greeting = new Intl.DateTimeFormat("en-US", {
    timeZone: data.farm.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8">
      <PageHeader
        eyebrow={greeting}
        title={`Good morning, ${data.user.name.split(" ")[0]}`}
        description="Here’s what the farm team needs to know from current records."
        action={
          <Link href="/activities" className="btn-primary desktop-only">
            <Plus size={18} />
            Log activity
          </Link>
        }
      />
      <section className="card relative mb-5 overflow-hidden bg-gradient-to-r from-[#244f38] to-[#34714d] p-5 text-white md:p-7">
        <div className="relative z-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Status>Active crop cycle</Status>
              <span className="text-xs text-white/70">
                {data.field.name} · {usUnits?`${hectaresToAcres(data.field.areaHa).toFixed(2)} ac`:`${data.field.areaHa.toFixed(2)} ha`}
              </span>
            </div>
            <p className="text-3xl font-bold">{data.cycle.crop}</p>
            <p className="mt-1 text-sm text-white/75">
              {data.cycle.variety || "Variety not recorded"} · {data.cycle.plantingDate
                ? `${data.cycle.planted ? "Planted" : "Planned"} ${new Intl.DateTimeFormat("en-US", { timeZone: data.farm.timezone, dateStyle: "medium" }).format(new Date(data.cycle.plantingDate))}`
                : "Not planted yet"}
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/20 rounded-2xl bg-white/10 p-4 text-center">
            <div className="px-4">
              <p className="text-2xl font-bold">{data.cycle.daysSincePlanting ?? "—"}</p>
              <p className="text-xs text-white/70">{data.cycle.daysSincePlanting == null ? "not planted" : "days old"}</p>
            </div>
            <div className="px-4">
              <p className="text-xl font-bold">{data.cycle.stage}</p>
              <p className="text-xs text-white/70">stage</p>
            </div>
            <div className="px-4">
              <p className="text-2xl font-bold">{data.cycle.daysRemaining ?? "—"}</p>
              <p className="text-xs text-white/70">days left</p>
            </div>
          </div>
        </div>
        <Sprout className="absolute -bottom-10 right-8 size-52 text-white/[.05]" />
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.8fr]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Today’s work</h2>
                <p className="text-sm text-slate-500">
                  {data.tasks.overdueCount} overdue · {data.tasks.upcomingCount} upcoming
                </p>
              </div>
              <Link href="/tasks" className="text-sm font-semibold text-farm-700">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {data.tasks.today.length === 0 && (
                <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">
                  No incomplete tasks are due today.
                </p>
              )}
              {data.tasks.today.map((t) => (
                <Link
                  href="/tasks"
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border p-3.5 hover:bg-farm-50"
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${t.category === "Irrigation" ? "bg-blue-50 text-blue-600" : t.category === "Maintenance" ? "bg-amber-50 text-amber-700" : "bg-farm-50 text-farm-700"}`}
                  >
                    {t.category === "Irrigation" ? (
                      <Droplets size={19} />
                    ) : t.category === "Maintenance" ? (
                      <Wrench size={19} />
                    ) : (
                      <Sprout size={19} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      {t.sector?.name ?? "All sectors"} ·{" "}
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: data.farm.timezone,
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(t.dueAt))}
                    </p>
                  </div>
                  <Status tone={t.priority === "CRITICAL" ? "red" : t.priority === "HIGH" ? "amber" : "blue"}>
                    {t.priority.toLowerCase()}
                  </Status>
                  <ChevronRight className="hidden text-slate-400 sm:block" size={18} />
                </Link>
              ))}
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Quick actions</h2>
              <p className="text-xs text-slate-500">Database-backed field logging</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quick.map(([label, Icon, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="card flex min-h-[104px] flex-col justify-between p-4 transition hover:-translate-y-0.5 hover:border-farm-200"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-farm-50 text-farm-700">
                    <Icon size={19} />
                  </span>
                  <span className="text-sm font-semibold">{label}</span>
                </Link>
              ))}
            </div>
          </section>
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Recent field activity</h2>
                <p className="text-sm text-slate-500">Latest persisted records</p>
              </div>
              <Link href="/activities" className="text-sm font-semibold text-farm-700">
                Timeline
              </Link>
            </div>
            <div>
              {data.recentActivities.length === 0 && (
                <p className="text-sm text-slate-500">No activity has been logged.</p>
              )}
              {data.recentActivities.map((a) => (
                <div key={a.id} className="flex gap-3 border-b py-3 first:pt-0 last:border-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-farm-50 text-farm-700">
                    {a.type === "IRRIGATION" ? <Droplets size={15} /> : <NotebookPen size={15} />}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{a.type.replaceAll("_", " ").toLowerCase()}</p>
                    <p className="text-xs text-slate-500">
                      {a.sector?.name ?? "All sectors"} · {a.createdBy.name}
                      {a.irrigationEvent
                        ? ` · ${Math.round(usUnits?litersToGallons(Number(a.irrigationEvent.estimatedLiters)):Number(a.irrigationEvent.estimatedLiters)).toLocaleString()} ${usUnits?"gal":"L"}`
                        : ""}
                    </p>
                  </div>
                  <time className="text-xs text-slate-400">
                    {new Intl.DateTimeFormat("en-US", {
                      timeZone: data.farm.timezone,
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(a.occurredAt))}
                  </time>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="card overflow-hidden">
            <div className="bg-[#eaf5f7] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Weather · {data.farm.country}
                  </p>
                  <p className="mt-2 text-3xl font-bold">
                    {data.weather?.temperatureC != null
                      ? `${Math.round(data.weather.temperatureC)}°C`
                      : "Unavailable"}
                  </p>
                  <p className="text-sm text-slate-600">Latest saved weather snapshot</p>
                </div>
                <Sun className="size-12 text-amber-500" />
              </div>
              <div className="mt-4 flex gap-5 text-xs text-slate-600">
                <span>
                  Humidity <b>{data.weather?.humidityPct ?? "—"}%</b>
                </span>
                <span>
                  Wind <b>{data.weather?.windKph ?? "—"} km/h</b>
                </span>
              </div>
            </div>
            <Link href="/weather" className="flex items-center gap-3 border-t p-4">
              <CloudRain className="text-blue-600" size={20} />
              <div>
                <p className="text-sm font-semibold">{rainProbability}% rain probability</p>
                <p className="text-xs text-slate-500">
                  Updated{" "}
                  {data.weather
                    ? new Intl.DateTimeFormat("en-US", {
                        timeZone: data.farm.timezone,
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(data.weather.observedAt))
                    : "never"}
                </p>
              </div>
            </Link>
          </section>
          {recommendation && (
            <section className="card border-l-4 border-l-blue-500 p-5">
              <div className="flex items-center gap-2">
                <Droplets className="text-blue-600" size={20} />
                <h2 className="font-bold">Irrigation decision support</h2>
              </div>
              <p className="mt-4 text-lg font-bold">
                {recommendation.name}: {recommendation.recommendation.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation.recommendation.reason}</p>
              <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                <b>Suggested action:</b> {recommendation.recommendation.action}
              </div>
              <Link
                href="/irrigation"
                className="mt-4 flex items-center gap-1 text-sm font-bold text-blue-700"
              >
                Review recommendation <ArrowRight size={15} />
              </Link>
              <p className="mt-3 text-[11px] text-slate-400">
                Decision support only—not agronomic certainty.
              </p>
            </section>
          )}
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Budget snapshot</h2>
              <Link href="/expenses" className="text-sm font-semibold text-farm-700">
                Details
              </Link>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{money(data.budget.actual)}</p>
                <p className="text-xs text-slate-500">of {money(data.budget.planned)} planned</p>
              </div>
              <p className="text-sm font-bold text-farm-700">{Math.round(data.budget.percentUsed)}% used</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-farm-600"
                style={{ width: `${Math.min(100, data.budget.percentUsed)}%` }}
              />
            </div>
            <p className="mt-3 text-sm">
              <b>{money(data.budget.remaining)}</b> remaining
            </p>
          </section>
          <section className="grid grid-cols-2 gap-3">
            <Link href="/inventory" className="card p-4">
              <Package className="mb-3 text-amber-600" size={21} />
              <p className="text-2xl font-bold">{data.alerts.lowStockCount}</p>
              <p className="text-xs text-slate-500">low-stock items</p>
            </Link>
            <Link href="/journal" className="card p-4">
              <AlertTriangle className="mb-3 text-red-600" size={21} />
              <p className="text-2xl font-bold">{data.alerts.openIssues}</p>
              <p className="text-xs text-slate-500">
                open issues{data.alerts.criticalIssues ? ` · ${data.alerts.criticalIssues} critical` : ""}
              </p>
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
