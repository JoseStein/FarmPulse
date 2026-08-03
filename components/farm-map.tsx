"use client";
import { selectSectorAction } from "@/app/actions";
import { AlertTriangle, Droplets } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Sector = {
  id: string;
  name: string;
  dripLines: number;
  status: string;
  alerts: number;
  otherAlerts: string[];
  lastIrrigation: {
    startedAt: string;
    durationMinutes: number;
    estimatedLiters: number;
    pressureBar: number | null;
    flowM3h: number;
  } | null;
  nextTask: { id: string; name: string; dueAt: string } | null;
  recommendation: { title: string };
  openIrrigationIssues: number;
};
const palette: Record<string, { fill: string; stroke: string }> = {
  Planning: { fill: "#eef2f7", stroke: "#94a3b8" },
  Healthy: { fill: "#dcefdc", stroke: "#70a678" },
  "Irrigation due": { fill: "#dcecf7", stroke: "#5b91b4" },
  "Attention needed": { fill: "#fff0cc", stroke: "#d39b36" },
  "Task overdue": { fill: "#f3e8ff", stroke: "#9333ea" },
  Critical: { fill: "#fee2e2", stroke: "#dc2626" },
  "Planned — not field verified": { fill: "#eef2f7", stroke: "#64748b" },
};

export function FarmMap({ sectors, timezone, selectedSectorId }: { sectors: Sector[]; timezone: string; selectedSectorId?: string }) {
  const initialIndex = Math.max(0, sectors.findIndex((sector) => sector.id === selectedSectorId));
  const [selected, setSelected] = useState(initialIndex);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const s = sectors[selected];
  const savedSelection = s?.id === selectedSectorId;
  function chooseSector(index: number) {
    setSelected(index);
    setError("");
    startTransition(async () => {
      const result = await selectSectorAction(sectors[index].id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }
  if (!s) return <div className="card p-8 text-center">No sectors are configured.</div>;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
      <div className="card p-3 sm:p-5">
        <div className="mb-3 grid grid-cols-2 gap-2 sm:hidden" aria-label="Choose a working sector">
          {sectors.map((sector, index) => (
            <button
              key={sector.id}
              type="button"
              onClick={() => chooseSector(index)}
              disabled={pending}
              aria-pressed={selected === index}
              className={`min-h-14 rounded-xl border px-3 py-2 text-left ${selected === index ? "border-farm-600 bg-farm-50 text-farm-900" : "bg-white text-slate-600"}`}
            >
              <span className="block text-sm font-bold">{sector.name}</span>
              <span className="block truncate text-xs">{sector.status}</span>
            </button>
          ))}
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#edf3e9] p-3 sm:p-7">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: "radial-gradient(#65816b 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <svg
            viewBox="0 0 700 610"
            role="img"
            aria-label={`Field with ${sectors.length} irrigation zone${sectors.length === 1 ? "" : "s"}`}
            className="relative w-full"
          >
            <defs>
              <pattern id="rows" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M0 0v12" stroke="#fff" strokeOpacity=".55" strokeWidth="3" />
              </pattern>
            </defs>
            <text x="350" y="30" textAnchor="middle" fontSize="17" fontWeight="700" fill="#496255">
              N ↑ · 100 meters
            </text>
            {sectors.map((sector, i) => {
              const single = sectors.length === 1,
                x = single ? 55 : i % 2 ? 355 : 55,
                y = single ? 55 : i > 1 ? 315 : 55,
                width = single ? 590 : 290,
                height = single ? 505 : 245,
                c = palette[sector.status] ?? palette["Attention needed"];
              return (
                <g
                  key={sector.id}
                  onClick={() => chooseSector(i)}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && chooseSector(i)}
                >
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx="18"
                    fill={c.fill}
                    stroke={selected === i ? "#285b3e" : c.stroke}
                    strokeWidth={selected === i ? 6 : 3}
                  />
                  <rect x={x + 13} y={y + 13} width={width - 26} height={height - 26} rx="11" fill="url(#rows)" />
                  <text x={x + 25} y={y + 38} fontSize="20" fontWeight="800" fill="#17352b">
                    {sector.name}
                  </text>
                  <text x={x + 25} y={y + 62} fontSize="13" fill="#496255">
                    {sector.dripLines} drip lines
                  </text>
                  <rect
                    x={x + 22}
                    y={y + height - 66}
                    width={Math.min(220, sector.status.length * 7.3 + 25)}
                    height="32"
                    rx="16"
                    fill="white"
                    fillOpacity=".88"
                  />
                    <text x={x + 35} y={y + height - 45} fontSize="13" fontWeight="700" fill="#314f42">
                    {sector.status}
                  </text>
                  {sector.alerts > 0 && (
                    <>
                      <circle cx={x + width - 35} cy={y + 30} r="16" fill="#c15a32" />
                      <text
                        x={x + width - 35}
                        y={y + 35}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="800"
                        fill="white"
                      >
                        {sector.alerts}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
            <text
              x="25"
              y="310"
              transform="rotate(-90 25 310)"
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill="#496255"
            >
              100 meters
            </text>
            {sectors.length > 1 && <path d="M350 55v505M55 307h590" stroke="#f8faf8" strokeWidth="8" />}
          </svg>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
          {Object.entries(palette).map(([label, c]) => (
            <span key={label} className="flex items-center gap-2">
              <i
                className="size-3 rounded-sm border"
                style={{ backgroundColor: c.fill, borderColor: c.stroke }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>
      <aside className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-farm-600">{savedSelection || pending ? "Working sector" : "Sector preview"}</p>
            <h2 className="mt-1 text-xl font-bold">{s.name}</h2>
            <p className="text-sm text-slate-500">
              {s.dripLines} drip lines
            </p>
          </div>
          <span className="rounded-full bg-farm-50 px-2.5 py-1 text-xs font-bold text-farm-700">{pending ? "Saving…" : savedSelection ? "Selected" : "Select on map"}</span>
          {s.alerts > 0 && (
            <span className="grid size-9 place-items-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle size={18} />
            </span>
          )}
        </div>
        <div className="my-5 h-px bg-slate-100" />
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <dl className="space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Status</dt>
            <dd className="text-right font-semibold">{s.status}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Last irrigation</dt>
            <dd className="text-right font-semibold">
              {s.lastIrrigation
                ? new Intl.DateTimeFormat("en-US", {
                    timeZone: timezone,
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(s.lastIrrigation.startedAt))
                : "No record"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Next task</dt>
            <dd className="text-right font-semibold">{s.nextTask?.name ?? "None scheduled"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Open alerts</dt>
            <dd className="text-right font-semibold">{s.alerts}</dd>
          </div>
        </dl>
        {s.otherAlerts.length > 0 && (
          <div className="mt-4 rounded-xl bg-amber-50 p-3">
            <p className="text-xs font-bold text-amber-900">Other conditions</p>
            {s.otherAlerts.slice(0, 3).map((x) => (
              <p className="mt-1 text-xs text-amber-800" key={x}>
                • {x}
              </p>
            ))}
          </div>
        )}
        <Link href={`/map/${s.id}`} className="btn-primary mt-6 w-full">
          View sector details
        </Link>
        <Link href={`/activities?type=irrigation&sector=${s.id}`} className="btn-secondary mt-2 w-full">
          <Droplets size={17} />
          Log irrigation
        </Link>
      </aside>
    </div>
  );
}
