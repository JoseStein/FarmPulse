import { LandPreparationView } from "@/components/land-preparation-view";
import { PageHeader } from "@/components/ui";
import { getLandPreparationData } from "@/lib/data/queries";
import { getFarmWeather } from "@/lib/weather";
import Link from "next/link";
import { Ruler } from "lucide-react";

export const metadata = { title: "Prepare the land" };

export default async function PrepareLandPage() {
  const weather = await getFarmWeather();
  const data = await getLandPreparationData(weather);
  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-8">
      <PageHeader
        eyebrow="Before planting"
        title="Prepare the land"
        description="An evidence-based starting point for a new farm. FarmPulse separates verified records from conditions that have not been assessed yet."
        action={<Link href="/land-design" className="btn-secondary"><Ruler size={17}/>View land design</Link>}
      />
      <LandPreparationView data={data} />
    </div>
  );
}
