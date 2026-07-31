import {PageHeader} from "@/components/ui";
import {TaskBoard} from "@/components/task-board";
import {getTaskPageData} from "@/lib/data/queries";

export const metadata = {title: "Tasks"};

export default async function TasksPage({searchParams}: {searchParams: Promise<{view?: string; sector?: string}>}) {
  const params = await searchParams;
  const view = (["today", "week", "all", "sector"].includes(params.view ?? "") ? params.view : "today") as "today" | "week" | "all" | "sector";
  const data = await getTaskPageData(view, params.sector);
  return <div className="mx-auto max-w-6xl p-4 md:p-8">
    <PageHeader eyebrow="Work schedule" title="Tasks" description="Plan field work, record progress, and keep a durable completion history."/>
    <TaskBoard {...data} activeView={view} activeSector={params.sector}/>
  </div>;
}
