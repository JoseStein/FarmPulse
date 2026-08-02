import Link from "next/link";
import { notFound } from "next/navigation";
import { getSectorSummary } from "@/lib/data/queries";
import { PageHeader, Status } from "@/components/ui";
import { ArrowLeft, Droplets, AlertTriangle, Leaf, NotebookPen, Clock, CircleDollarSign } from "lucide-react";
import { money } from "@/lib/utils";
export default async function SectorPage({ params }: { params: Promise<{ sectorId: string }> }) {
  const { sectorId } = await params;
  const data = await getSectorSummary(sectorId);
  if (!data) notFound();
  const s = data.sector;
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <Link href="/map" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-farm-700">
        <ArrowLeft size={16} />
        Back to field map
      </Link>
      <PageHeader
        eyebrow="Working-sector details"
        title={s.name}
        description={`${s.dripLines} drip lines · active ${data.cycle.crop} cycle`}
        action={
          <Link href={`/activities?sector=${s.id}`} className="btn-primary">
            <Droplets size={17} />
            Quick log
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500">Current status</p>
          <div className="mt-2">
            <Status
              tone={
                s.status === "Healthy"
                  ? "green"
                  : s.status === "Critical"
                    ? "red"
                    : s.status === "Irrigation due"
                      ? "blue"
                      : "amber"
              }
            >
              {s.status}
            </Status>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Growth stage</p>
          <p className="mt-2 font-bold">{data.cycle.stage}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Last irrigation</p>
          <p className="mt-2 font-bold">
            {s.lastIrrigation
              ? new Intl.DateTimeFormat("en-US", {
                  timeZone: data.farm.timezone,
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(s.lastIrrigation.startedAt))
              : "No record"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Alerts</p>
          <p className="mt-2 font-bold">{s.alerts} open</p>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="card p-5">
          <h2 className="font-bold">Activity timeline</h2>
          <div className="mt-5 space-y-5">
            {data.activities.length === 0 && (
              <p className="text-sm text-slate-500">No activity recorded for this sector.</p>
            )}
            {data.activities.map((a) => (
              <div className="flex gap-3" key={a.id}>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-farm-50 text-farm-700">
                  {a.type === "IRRIGATION" ? (
                    <Droplets size={17} />
                  ) : a.type === "FERTILIZER_APPLICATION" ? (
                    <Leaf size={17} />
                  ) : (
                    <NotebookPen size={17} />
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold">{a.type.replaceAll("_", " ").toLowerCase()}</p>
                  <p className="text-xs text-slate-500">
                    {a.notes || `${a.createdBy.name} recorded this activity.`}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {new Intl.DateTimeFormat("en-US", {
                      timeZone: data.farm.timezone,
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(a.occurredAt))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="font-bold">Scheduled work</h2>
            <div className="mt-3 space-y-3">
              {data.tasks.length === 0 && <p className="text-sm text-slate-500">No scheduled tasks.</p>}
              {data.tasks.slice(0, 5).map((t) => (
                <div key={t.id} className="rounded-xl border p-3">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <Status tone={t.status === "OVERDUE" ? "red" : "slate"}>
                      {t.status.toLowerCase().replace("_", " ")}
                    </Status>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Intl.DateTimeFormat("en-US", {
                      timeZone: data.farm.timezone,
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(t.dueAt))}
                  </p>
                </div>
              ))}
            </div>
          </section>
          {data.issues.length > 0 && (
            <section className="card border-amber-200 bg-amber-50 p-5">
              <div className="flex gap-3">
                <AlertTriangle className="shrink-0 text-amber-700" />
                <div>
                  <h2 className="font-bold text-amber-950">Open issues</h2>
                  {data.issues
                    .filter((i) => !["RESOLVED", "CLOSED"].includes(i.status))
                    .map((i) => (
                      <p key={i.id} className="mt-1 text-sm text-amber-900">
                        {i.title} · {i.severity.toLowerCase()}
                      </p>
                    ))}
                </div>
              </div>
            </section>
          )}
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <CircleDollarSign size={18} />
              Sector expenses
            </h2>
            <p className="mt-3 text-2xl font-bold">
              {money(data.expenses.reduce((sum, e) => sum + e.amount, 0))}
            </p>
            <p className="text-xs text-slate-500">{data.expenses.length} active records</p>
          </section>
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <Clock size={18} />
              Irrigation history
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              {data.irrigation.length} recent events · {Math.round(s.totalEstimatedLiters).toLocaleString()} L
              this cycle
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
