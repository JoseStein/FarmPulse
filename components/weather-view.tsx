"use client";
/* The initial effect hydrates data from the protected weather service. */
import type { WeatherResult } from "@/lib/weather";
import { AlertTriangle, CloudRain, Droplets, Loader2, RefreshCw, Sun, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { Status } from "./ui";
import {millimetersToInches} from "@/lib/utils";

export function WeatherView({ timezone,unitSystem }: { timezone: string;unitSystem:string }) {
  const [data, setData] = useState<WeatherResult | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const us=unitSystem==="US";
  const temp=(c:number|null)=>c==null?"—":`${Math.round(us?c*9/5+32:c)}°${us?"F":"C"}`;
  const rain=(mm:number|null)=>mm==null?"—":`${(us?millimetersToInches(mm):mm).toFixed(us?2:1)} ${us?"in":"mm"}`;
  const wind=(kph:number|null)=>kph==null?"—":`${Math.round(us?kph*0.621371:kph)} ${us?"mph":"km/h"}`;
  async function load(forceRefresh=false) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(forceRefresh?"/api/weather?refresh=1":"/api/weather", { cache: "no-store" });
      if (!response.ok) throw new Error("Weather request failed");
      setData(await response.json());
    } catch {
      setError("Weather could not be loaded. Field logging remains available.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const interval=window.setInterval(()=>void load(true),10*60*1000);
    return ()=>window.clearInterval(interval);
  }, []);
  if (loading && !data)
    return (
      <div className="card grid min-h-80 place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-farm-600" />
          <p className="mt-3 text-sm text-slate-500">Loading farm weather…</p>
        </div>
      </div>
    );
  if (error && !data)
    return (
      <div className="card p-8 text-center">
        <AlertTriangle className="mx-auto text-amber-600" />
        <p className="mt-3 font-semibold">{error}</p>
        <button onClick={()=>load(true)} className="btn-secondary mt-4">
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  if (!data) return null;
  return (
    <>
      {data.message && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {data.message}
        </div>
      )}
      <section className="card overflow-hidden">
        <div className="grid gap-5 bg-[#eaf5f7] p-6 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Status tone={data.source === "live" ? "green" : "amber"}>
                {data.source.replace("-", " ")}
              </Status>
              {data.stale && <Status tone="amber">Stale</Status>}
              <button disabled={loading} onClick={()=>load(true)} className="btn-secondary !min-h-8 !px-3">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh live
              </button>
            </div>
            {data.location&&<p className="mt-3 text-sm font-semibold text-slate-700">{data.location.name} · {data.location.latitude.toFixed(5)}, {data.location.longitude.toFixed(5)}</p>}
            <p className="mt-4 text-5xl font-bold">
              {temp(data.current.temperatureC)}
            </p>
            <p className="mt-2 text-slate-600">
              Feels like {temp(data.current.apparentTemperatureC)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Provider observation{" "}
              {new Intl.DateTimeFormat("en-US", {
                timeZone: timezone,
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(data.updatedAt))}
            </p>
            <p className="mt-1 text-xs text-slate-500">Automatically checks for new conditions every 10 minutes.</p>
          </div>
          <Sun className="size-24 text-amber-500" />
        </div>
        <div className="grid grid-cols-3 divide-x p-5 text-center">
          <div>
            <Droplets className="mx-auto text-blue-600" size={19} />
            <p className="mt-2 font-bold">{data.current.humidityPct ?? "—"}%</p>
            <p className="text-xs text-slate-500">Humidity</p>
          </div>
          <div>
            <Wind className="mx-auto text-blue-600" size={19} />
            <p className="mt-2 font-bold">{wind(data.current.windKph)}</p>
            <p className="text-xs text-slate-500">Wind</p>
          </div>
          <div>
            <CloudRain className="mx-auto text-blue-600" size={19} />
            <p className="mt-2 font-bold">{rain(data.current.precipitationMm)}</p>
            <p className="text-xs text-slate-500">Current rain</p>
          </div>
        </div>
      </section>
      {data.daily.length > 0 && (
        <section className="card mt-5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Seven-day forecast</h2>
            <button disabled={loading} onClick={()=>load(true)} className="btn-secondary !min-h-9">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2 overflow-x-auto">
            {data.daily.map((day) => (
              <div className="min-w-24 rounded-xl bg-slate-50 p-3 text-center" key={day.date}>
                <p className="text-xs font-bold text-slate-500">
                  {new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
                    new Date(`${day.date}T12:00:00Z`),
                  )}
                </p>
                {day.rainProbability >= 40 ? (
                  <CloudRain className="mx-auto my-3 text-blue-500" />
                ) : (
                  <Sun className="mx-auto my-3 text-amber-500" />
                )}
                <p className="font-bold">
                  {temp(day.temperatureMaxC)}
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  {day.rainProbability}% · {rain(day.precipitationMm)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {data.notices.map((n) => (
          <section
            key={n.title}
            className={`rounded-2xl border p-5 ${n.severity === "HIGH" ? "border-amber-300 bg-amber-50" : "bg-white"}`}
          >
            <div className="flex gap-3">
              <AlertTriangle className={n.severity === "HIGH" ? "text-amber-700" : "text-farm-600"} />
              <div>
                <h2 className="font-bold">{n.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{n.message}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  Operational decision support—not a guarantee.
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
