"use client";
import { useMemo, useState } from "react";
import { AlertCircle, BookOpen, ChevronRight, Search, Sprout, X } from "lucide-react";
import { PageHeader, Status, Empty } from "@/components/ui";

type Article = {
  id: string;
  title: string;
  summary: string;
  content: string;
  stage: string | null;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  sourceName: string | null;
  sourceUrl: string | null;
  lastReviewedAt: string | null;
  regionApplicability: string | null;
  adminNotes: string | null;
  score: number;
};
type Props = {
  data: {
    guide: { id: string | null; title: string };
    crop: string;
    stage: string;
    daysSincePlanting: number | null;
    articles: Article[];
    context: {
      openIssues: number;
      openTasks: number;
      weatherObservedAt: string | null;
      lastIrrigationAt: string | null;
    };
  };
};

export function GuideView({ data }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Article | null>(null);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(data.articles.map((a) => a.category)))],
    [data.articles],
  );
  const rows = data.articles.filter(
    (a) =>
      (category === "All" || a.category === category) &&
      `${a.title} ${a.summary} ${a.content} ${a.stage ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <PageHeader
        eyebrow="Curated crop knowledge"
        title="Crop guide"
        description={data.crop === "Crop not selected" ? "Select a crop to receive crop-specific guidance." : `Current crop: ${data.crop}. Guidance is ranked for its active stage and current farm records.`}
      />
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="shrink-0 text-amber-700" size={20} />
          <p className="text-sm leading-6 text-amber-900">
            <b>Educational decision support.</b> Confirm pesticide labels, local regulations, and important
            treatment decisions with a qualified agricultural professional.
          </p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <div className="card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input
                className="input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the guide…"
              />
            </div>
            <nav className="mt-4 space-y-1">
              {categories.map((x) => (
                <button
                  key={x}
                  onClick={() => setCategory(x)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium ${category === x ? "bg-farm-50 text-farm-700" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {x}
                  <ChevronRight size={15} />
                </button>
              ))}
            </nav>
          </div>
          <div className="card bg-farm-900 p-5 text-white">
            <Sprout className="text-[#e6d57c]" />
            <p className="mt-3 text-sm font-bold">Current crop stage</p>
            <p className="mt-1 text-xl font-bold">{data.stage}</p>
            <p className="mt-2 text-xs leading-5 text-white/70">
              {data.daysSincePlanting == null
                ? "Not planted yet"
                : `${data.daysSincePlanting} days since planting`}{" "}
              · {data.context.openIssues} open issues · {data.context.openTasks} open tasks
            </p>
          </div>
        </aside>
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold">Recommended for right now</h2>
            <p className="text-sm text-slate-500">
              Ranked using crop stage, issues, tasks, recent irrigation, and saved weather
            </p>
          </div>
          {rows.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {rows.map((a, i) => (
                <article className="card p-5 transition hover:border-farm-200" key={a.id}>
                  <div className="flex items-start justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-farm-50 text-farm-700">
                      <BookOpen size={19} />
                    </span>
                    <Status
                      tone={
                        a.score > 0 && i < 2
                          ? "green"
                          : a.severity === "HIGH" || a.severity === "CRITICAL"
                            ? "amber"
                            : "slate"
                      }
                    >
                      {a.score > 0 ? "Recommended" : a.stage || "Reference"}
                    </Status>
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-farm-600">
                    {a.category} · {a.stage || "All stages"}
                  </p>
                  <h3 className="mt-2 font-bold">{a.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{a.summary}</p>
                  <button
                    onClick={() => setSelected(a)}
                    className="mt-4 flex items-center gap-1 text-sm font-bold text-farm-700"
                  >
                    Read guidance <ChevronRight size={15} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <Empty title="No matching guidance" body="Try another search term or category." />
          )}
          <p className="mt-5 text-xs text-slate-400">
            Guidance is educational and region applicability must be validated locally.
          </p>
        </section>
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-5"
          onClick={() => setSelected(null)}
        >
          <article
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-farm-600">
                  {selected.category} · {selected.stage || "All stages"}
                </p>
                <h2 className="mt-2 text-xl font-bold">{selected.title}</h2>
              </div>
              <button
                className="grid size-9 place-items-center rounded-full bg-slate-100"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{selected.content}</p>
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              <p>
                <b>Region:</b> {selected.regionApplicability || "Validate locally"}
              </p>
              <p>
                <b>Source:</b> {selected.sourceName || "Farm guide editorial content"}
              </p>
              <p>
                <b>Last reviewed:</b>{" "}
                {selected.lastReviewedAt
                  ? new Date(selected.lastReviewedAt).toLocaleDateString()
                  : "Not recorded"}
              </p>
              {selected.sourceUrl && (
                <a
                  className="font-bold text-farm-700"
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source
                </a>
              )}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
