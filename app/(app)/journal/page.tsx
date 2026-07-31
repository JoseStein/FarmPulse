import {JournalView} from "@/components/journal-view";
import {PageHeader} from "@/components/ui";
import {getJournalPageData} from "@/lib/data/queries";
export const metadata={title:"Field journal"};
export default async function JournalPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const p=await searchParams;const data=await getJournalPageData();return <div className="mx-auto max-w-5xl p-4 md:p-8"><PageHeader eyebrow="Notes, photos & issues" title="Field journal" description="A permanent chronological record of observations, issues, and follow-up work."/><JournalView data={data} startNew={p.new==="1"||p.issue==="1"} startIssue={p.issue==="1"}/></div>}
