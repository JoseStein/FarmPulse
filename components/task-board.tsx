"use client";

import { createTaskAction, updateTaskStatusAction } from "@/app/actions";
import { Status } from "./ui";
import { CalendarDays, Check, Circle, Clock3, Filter, ListChecks, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type TaskRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueAt: string;
  status: "PLANNED" | "DUE_TODAY" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "OVERDUE";
  completionNotes: string | null;
  completedAt: string | null;
  sector: { id: string; name: string } | null;
  assignedUser: { id: string; name: string } | null;
  completedBy: { id: string; name: string } | null;
  relatedActivity: { id: string } | null;
};

const labels = { today: "Today", week: "Week", all: "All tasks", sector: "By sector" } as const;
const activityCategories = new Set([
  "Irrigation",
  "Fertilization",
  "Pest inspection",
  "Disease inspection",
  "Weed control",
  "Maintenance",
  "Planting",
  "Harvest",
]);

export function TaskBoard({
  tasks,
  sectors,
  members,
  role,
  timezone,
  tomorrowDate,
  activeView,
  activeSector,
  selectedSectorId,
}: {
  tasks: TaskRow[];
  sectors: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
  role: "ADMIN" | "OPERATOR";
  timezone: string;
  tomorrowDate: string;
  activeView: keyof typeof labels;
  activeSector?: string;
  selectedSectorId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<TaskRow | null>(null);
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const dateTime = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  function navigate(view: keyof typeof labels, sector?: string) {
    const q = new URLSearchParams({ view });
    if (sector) q.set("sector", sector);
    router.push(`/tasks?${q}`);
  }
  function change(task: TaskRow, status: "IN_PROGRESS" | "COMPLETED" | "SKIPPED", notes?: string) {
    setWorking(task.id);
    setMessage(null);
    startTransition(async () => {
      const result = await updateTaskStatusAction({
        taskId: task.id,
        status,
        completionNotes: notes,
        createActivity: status === "COMPLETED" && activityCategories.has(task.category),
      });
      setWorking(null);
      if (!result.ok) setMessage({ tone: "error", text: result.error });
      else {
        setMessage({
          tone: "ok",
          text:
            status === "COMPLETED"
              ? "Task completed and saved."
              : status === "SKIPPED"
                ? "Task skipped."
                : "Task is now in progress.",
        });
        setDetail(null);
        router.refresh();
      }
    });
  }
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  return (
    <>
      {message && (
        <div
          role="status"
          className={`mb-4 rounded-xl p-3 text-sm font-semibold ${message.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
        >
          {message.text}
        </div>
      )}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl border bg-white p-1 sm:w-fit">
          {(Object.keys(labels) as Array<keyof typeof labels>).map((view) => (
            <button
              key={view}
              onClick={() => navigate(view, view === "sector" ? selectedSectorId ?? sectors[0]?.id : undefined)}
              className={`min-h-10 whitespace-nowrap rounded-lg px-4 text-sm font-semibold ${activeView === view ? "bg-farm-700 text-white" : "text-slate-500"}`}
            >
              {labels[view]}
            </button>
          ))}
        </div>
        {role === "ADMIN" && (
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus size={17} />
            New task
          </button>
        )}
      </div>
      {activeView === "sector" && (
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {sectors.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate("sector", s.id)}
              className={`btn-secondary !min-h-9 whitespace-nowrap ${activeSector === s.id ? "border-farm-600 bg-farm-50 text-farm-700" : ""}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <section className="space-y-3">
          {tasks.length === 0 && (
            <div className="card p-8 text-center">
              <p className="font-semibold">No tasks in this view</p>
              <p className="mt-1 text-sm text-slate-500">Scheduled work will appear here.</p>
            </div>
          )}
          {tasks.map((t) => (
            <article
              key={t.id}
              className={`card p-4 ${["COMPLETED", "SKIPPED"].includes(t.status) ? "opacity-65" : ""}`}
            >
              <div className="flex gap-3">
                <button
                  disabled={pending || ["COMPLETED", "SKIPPED"].includes(t.status)}
                  onClick={() => change(t, "COMPLETED")}
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 ${t.status === "COMPLETED" ? "border-farm-600 bg-farm-600 text-white" : "border-slate-300"}`}
                  aria-label={`Complete ${t.name}`}
                >
                  {working === t.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    t.status === "COMPLETED" && <Check size={15} />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className={`font-semibold ${t.status === "COMPLETED" ? "line-through" : ""}`}>
                        {t.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {t.sector?.name ?? "All sectors"}
                        {t.assignedUser ? ` · ${t.assignedUser.name}` : ""}
                      </p>
                    </div>
                    <Status
                      tone={
                        t.status === "OVERDUE"
                          ? "red"
                          : t.status === "COMPLETED"
                            ? "green"
                            : t.priority === "HIGH" || t.priority === "CRITICAL"
                              ? "amber"
                              : "blue"
                      }
                    >
                      {t.status.replaceAll("_", " ").toLowerCase()}
                    </Status>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock3 size={14} />
                      {dateTime(t.dueAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Circle
                        size={8}
                        className={
                          t.priority === "CRITICAL"
                            ? "fill-red-500 text-red-500"
                            : t.priority === "HIGH"
                              ? "fill-amber-500 text-amber-500"
                              : "fill-blue-400 text-blue-400"
                        }
                      />
                      {t.priority.toLowerCase()} priority
                    </span>
                  </div>
                  {!["COMPLETED", "SKIPPED"].includes(t.status) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        disabled={pending}
                        onClick={() => change(t, "COMPLETED")}
                        className="btn-primary !min-h-9 px-3"
                      >
                        Complete
                      </button>
                      {t.status !== "IN_PROGRESS" && (
                        <button
                          disabled={pending}
                          onClick={() => change(t, "IN_PROGRESS")}
                          className="btn-secondary !min-h-9 px-3"
                        >
                          Start
                        </button>
                      )}
                      <button onClick={() => setDetail(t)} className="btn-secondary !min-h-9 px-3">
                        Details
                      </button>
                    </div>
                  )}
                  {t.completedAt && (
                    <p className="mt-3 text-xs text-slate-400">
                      Completed {dateTime(t.completedAt)} by {t.completedBy?.name ?? "farm user"}
                      {t.relatedActivity ? " · Activity created" : ""}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <ListChecks size={19} />
              Progress
            </h2>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-3xl font-bold">
                {completed}
                <span className="text-base text-slate-400"> / {tasks.length}</span>
              </p>
              <p className="text-sm font-semibold text-farm-700">{progress}%</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-farm-600" style={{ width: `${progress}%` }} />
            </div>
          </section>
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <CalendarDays size={19} />
              Current view
            </h2>
            <p className="mt-3 text-sm text-slate-600">{labels[activeView]}</p>
            <p className="mt-1 text-sm text-slate-500">
              {tasks.length} task{tasks.length === 1 ? "" : "s"}
            </p>
          </section>
          <button onClick={() => navigate("all")} className="btn-secondary w-full">
            <Filter size={16} />
            Clear filters
          </button>
        </aside>
      </div>
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-bold">{detail.name}</h2>
                <p className="text-sm text-slate-500">
                  {detail.category} · {detail.sector?.name ?? "All sectors"}
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="grid size-10 place-items-center rounded-full bg-slate-100"
              >
                <X />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {detail.description || "No additional description."}
            </p>
            <label className="label mt-5" htmlFor="completion-notes">
              Completion notes
            </label>
            <textarea
              id="completion-notes"
              className="input min-h-24 py-3"
              placeholder="What was completed or observed?"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const notes = (document.getElementById("completion-notes") as HTMLTextAreaElement).value;
                  change(detail, "COMPLETED", notes);
                }}
                className="btn-primary"
              >
                Complete
              </button>
              <button onClick={() => change(detail, "SKIPPED")} className="btn-secondary">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
      {createOpen && (
        <TaskCreateModal
          sectors={sectors}
          members={members}
          tomorrowDate={tomorrowDate}
          selectedSectorId={selectedSectorId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function TaskCreateModal({
  sectors,
  members,
  tomorrowDate,
  selectedSectorId,
  onClose,
  onSaved,
}: {
  sectors: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
  tomorrowDate: string;
  selectedSectorId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await createTaskAction(Object.fromEntries(form));
      if (!result.ok) setError(result.error);
      else onSaved();
    });
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between">
          <div>
            <h2 className="text-xl font-bold">New task</h2>
            <p className="text-sm text-slate-500">Schedule practical farm work.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-slate-100"
          >
            <X />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Task name</label>
            <input name="name" className="input" required />
          </div>
          <div>
            <label className="label">Category</label>
            <select name="category" className="input">
              {[
                "Irrigation",
                "Planting",
                "Fertilization",
                "Pest inspection",
                "Disease inspection",
                "Weed control",
                "Maintenance",
                "Inventory",
                "Harvest",
                "Administrative",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select name="priority" className="input">
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div>
            <label className="label">Sector</label>
            <select name="sectorId" className="input" defaultValue={selectedSectorId ?? ""}>
              <option value="">All sectors</option>
              {sectors.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Assigned to</label>
            <select name="assignedUserId" className="input">
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input name="dueDate" type="date" defaultValue={tomorrowDate} className="input" required />
          </div>
          <div>
            <label className="label">Due time</label>
            <input name="dueTime" type="time" defaultValue="08:00" className="input" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea name="description" className="input min-h-20 py-3" />
          </div>
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={pending} className="btn-primary mt-5 w-full">
          {pending && <Loader2 size={16} className="animate-spin" />}Create task
        </button>
      </form>
    </div>
  );
}
