import type { LandDesign } from "@/lib/land-design";
import { Status } from "@/components/ui";
import { AlertTriangle, Building2, Droplets, MapPinned, Route, Ruler, Waves } from "lucide-react";

type FieldRow = {
  id: string;
  name: string;
  areaHa: number;
  sectors: Array<{ id: string; name: string; dripLines: number; status: string }>;
  cycle: {
    id: string;
    crop: { name: string };
    growthStage: { name: string } | null;
    variety: string | null;
    plannedPlantingDate: string | null;
    actualPlantingDate: string | null;
  } | null;
};

export function LandDesignView({
  design,
  fields,
  persisted,
}: {
  design: LandDesign;
  fields: FieldRow[];
  persisted: boolean;
}) {
  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-4 border-b bg-[#fafbf9] p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <div className="flex flex-wrap gap-2"><Status tone="blue">May 2024 design</Status><Status tone="amber">Planned · not field verified</Status></div>
            <h2 className="mt-3 text-xl font-bold">{design.document.drawing}</h2>
            <p className="mt-1 text-sm text-slate-500">{design.document.revision} · Scale {design.document.scale} · {design.coordinateSystem.datum}, Zone {design.coordinateSystem.zone}</p>
          </div>
          <Status tone={persisted ? "green" : "amber"}>{persisted ? "Saved in FarmPulse" : "Reference preview"}</Status>
        </div>
        <div className="p-3 md:p-6">
          <div className="overflow-hidden rounded-2xl border bg-[#183e26] p-2 md:p-4">
            <svg viewBox="0 0 900 650" className="w-full" role="img" aria-label="Planned ten-hectare farm with four production lots, roads, infrastructure, and irrigation system">
              <defs>
                <pattern id="designRows" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 0v10" stroke="#8fd39a" strokeOpacity=".45" strokeWidth="2" /></pattern>
                <linearGradient id="river" x1="0" x2="1"><stop stopColor="#2a82b8"/><stop offset="1" stopColor="#54b8d4"/></linearGradient>
              </defs>
              <path d="M100 55 L790 55 L825 570 L150 590 L65 470 L70 170 Z" fill="#285b34" stroke="#ef4444" strokeDasharray="8 6" strokeWidth="4" />
              <path d="M90 85 L770 85 M105 550 L805 540 M95 85 L90 505 M790 80 L805 540" fill="none" stroke="#b98a4c" strokeWidth="24" opacity=".85" />
              <path d="M445 90V545 M90 335H805" fill="none" stroke="#c99a58" strokeWidth="25" />
              <path d="M0 610 Q240 560 460 615 T900 600 V650 H0Z" fill="url(#river)" />
              <text x="450" y="630" textAnchor="middle" fill="white" fontSize="19" fontWeight="700">RÍO CHICO</text>
              <g><rect x="125" y="95" width="235" height="62" rx="8" fill="#719c4e" stroke="#d7e4b1"/><text x="242" y="118" textAnchor="middle" fill="white" fontWeight="700">INFRASTRUCTURE · 0.40 ha</text><text x="242" y="140" textAnchor="middle" fill="white" fontSize="13">Warehouse · Workshop · Office</text></g>
              {[
                { x: 125, y: 180, lot: design.lots[0] },
                { x: 500, y: 130, lot: design.lots[1] },
                { x: 125, y: 370, lot: design.lots[2] },
                { x: 500, y: 365, lot: design.lots[3] },
              ].map(({ x, y, lot }) => (
                <g key={lot.number}>
                  <rect x={x} y={y} width="255" height="160" rx="8" fill="#175f2f" stroke="#f0c64f" strokeWidth="3" />
                  <rect x={x + 10} y={y + 10} width="235" height="140" fill="url(#designRows)" />
                  <text x={x + 127} y={y + 58} textAnchor="middle" fill="white" fontSize="20" fontWeight="800">{lot.name.toUpperCase()}</text>
                  <text x={x + 127} y={y + 91} textAnchor="middle" fill="white" fontSize="17">{lot.areaHa.toFixed(2)} ha</text>
                  <text x={x + 127} y={y + 116} textAnchor="middle" fill="#f3d260" fontSize="13">{lot.beds} beds × {lot.bedLengthM} m</text>
                  <text x={x + 127} y={y + 137} textAnchor="middle" fill="#d7eadb" fontSize="11">Drawing example: {lot.drawingExampleCrop} · not assigned</text>
                </g>
              ))}
              <path d="M225 575H775V325H380 M775 325H625 M445 325V130" fill="none" stroke="#4fa3ff" strokeWidth="6" />
              <circle cx="775" cy="325" r="30" fill="#3887d6" stroke="white" strokeWidth="3"/><text x="775" y="320" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">24,000 L</text><text x="775" y="336" textAnchor="middle" fill="white" fontSize="10">TANK</text>
              <circle cx="225" cy="575" r="13" fill="#ef6b3a" stroke="white" strokeWidth="2"/><text x="245" y="580" fill="white" fontSize="12">Intake pump + gravel filter</text>
              <circle cx="680" cy="325" r="12" fill="#a855f7"/><circle cx="620" cy="325" r="12" fill="#111827"/>
              <text x="650" y="305" textAnchor="middle" fill="white" fontSize="11">Pressure pump · disk filter</text>
              <text x="450" y="25" textAnchor="middle" fill="white" fontSize="17" fontWeight="700">N ↑ · Main entrance at northeast</text>
            </svg>
          </div>
          <p className="mt-3 text-xs text-slate-500">FarmPulse schematic transcribed from the owner-provided drawing. It preserves the planning relationships but is not a replacement for the original engineering plan or a field survey.</p>
          <p className="mt-2 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">{design.document.cropLabelInterpretation}</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {fields.map((field) => (
          <article key={field.id} className="card p-4">
            <div className="flex items-start justify-between gap-2"><div><p className="font-bold">{field.name}</p><p className="text-sm text-slate-500">{field.areaHa.toFixed(2)} ha</p></div><Status tone="blue">{field.cycle?.growthStage?.name ?? "No cycle"}</Status></div>
            <p className="mt-4 text-xl font-bold text-farm-800">{field.cycle?.crop.name ?? "Not assigned"}</p>
            <p className="mt-1 text-xs text-slate-500">{field.sectors.length} irrigation zone{field.sectors.length === 1 ? "" : "s"} · {field.sectors.reduce((sum, sector) => sum + sector.dripLines, 0)} planned drip lines</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-5 md:p-6">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Droplets size={20}/></span><div><h2 className="font-bold">Planned hydraulic sequence</h2><p className="text-sm text-slate-500">Source to independent lot valves</p></div></div>
          <ol className="mt-5 space-y-3">{design.irrigation.sequence.map((item, index)=><li key={item} className="flex gap-3 text-sm"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{index+1}</span><span className="pt-1">{item}</span></li>)}</ol>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">Drip tape</p><p className="font-bold">{design.irrigation.dripTapeMm} mm · {design.irrigation.tapesPerBed} per bed</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">Emitter spacing</p><p className="font-bold">{design.irrigation.emitterSpacingM.toFixed(2)} m</p></div></div>
        </section>

        <section className="card p-5 md:p-6">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><AlertTriangle size={20}/></span><div><h2 className="font-bold">Design conflicts requiring confirmation</h2><p className="text-sm text-slate-500">Excluded from automatic calculations</p></div></div>
          <div className="mt-5 space-y-3">{design.discrepancies.map(item=><article key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-amber-950">{item.title}</h3><Status tone="amber">unverified</Status></div><p className="mt-2 text-sm text-amber-900">{item.detail}</p><p className="mt-2 text-xs font-semibold text-amber-800">Next: {item.resolution}</p></article>)}</div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <section className="card p-5 md:p-6">
          <div className="flex items-center gap-3"><Building2 size={20} className="text-farm-700"/><h2 className="font-bold">Infrastructure and access</h2></div>
          <div className="mt-4 space-y-3 text-sm">{design.infrastructure.map(item=><div key={item.name} className="flex justify-between gap-3 border-b pb-3"><span>{item.name}</span><span className="text-right font-semibold">{"dimensionsM" in item ? `${item.dimensionsM[0]} × ${item.dimensionsM[1]} m` : "Location planned"}</span></div>)}</div>
          <div className="mt-5 flex items-center gap-3"><Route size={20} className="text-farm-700"/><h3 className="font-bold">Roads</h3></div>
          <div className="mt-3 space-y-2 text-sm">{design.roads.map(road=><div key={road.name} className="flex justify-between"><span>{road.name}</span><span className="font-semibold">{road.widthM.toFixed(2)} m</span></div>)}</div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b p-5 md:p-6"><div className="flex items-center gap-3"><MapPinned size={20} className="text-farm-700"/><div><h2 className="font-bold">Property-boundary coordinates</h2><p className="text-sm text-slate-500">UTM · {design.coordinateSystem.datum} · Zone {design.coordinateSystem.zone}</p></div></div></div>
          <div className="max-h-[430px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Vertex</th><th className="px-5 py-3">East (m)</th><th className="px-5 py-3">North (m)</th></tr></thead><tbody className="divide-y">{design.boundaryVertices.map(point=><tr key={point.vertex}><td className="px-5 py-3 font-bold">{point.vertex}</td><td className="px-5 py-3 tabular-nums">{point.east.toFixed(2)}</td><td className="px-5 py-3 tabular-nums">{point.north.toFixed(2)}</td></tr>)}</tbody></table></div>
        </section>
      </div>

      <section className="card p-5 md:p-6">
        <div className="flex items-center gap-3"><Ruler size={20} className="text-farm-700"/><div><h2 className="font-bold">Field-verification checklist</h2><p className="text-sm text-slate-500">These remain planned until evidence is recorded.</p></div></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">{design.verificationChecklist.map((item,index)=><div key={item} className="flex gap-3 rounded-xl border p-3 text-sm"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{index+1}</span><span>{item}</span></div>)}</div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900"><div className="flex gap-3"><Waves className="shrink-0" size={20}/><p><b>Design evidence policy:</b> planned infrastructure and dimensions can guide work, but FarmPulse will only mark them installed or operational after a field record, inspection, or measured test confirms them.</p></div></section>
    </div>
  );
}
