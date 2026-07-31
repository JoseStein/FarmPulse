import {ActivityLogger} from "@/components/activity-logger";
import {PageHeader} from "@/components/ui";
import {getActivityPageData} from "@/lib/data/queries";

export const metadata={title:"Log activity"};

export default async function ActivitiesPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const params=await searchParams; const data=await getActivityPageData();
  return <div className="mx-auto max-w-5xl p-4 md:p-8"><PageHeader eyebrow="Field log" title="Record field activity" description="Save field work to the permanent crop-cycle history."/><ActivityLogger data={data} initialType={params.type} initialSector={params.sector}/></div>;
}
