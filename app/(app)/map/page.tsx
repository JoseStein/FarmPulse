import {FarmMap} from "@/components/farm-map";
import {PageHeader} from "@/components/ui";
import {getSectorSummaries} from "@/lib/data/queries";
import {Ruler, Sprout} from "lucide-react";
import Link from "next/link";
export const metadata={title:"Farm map"};
export default async function MapPage(){const data=await getSectorSummaries();return <div className="mx-auto max-w-[1400px] p-4 md:p-8"><PageHeader eyebrow={data.farm.name} title="Farm map" description={`Select the sector where you are working. FarmPulse will remember it and prefill sector-aware records across the app.`} action={<div className="flex flex-wrap gap-2"><Link href="/prepare" className="btn-secondary"><Sprout size={17}/>Prepare land</Link><Link href="/land-design" className="btn-secondary"><Ruler size={17}/>Land design</Link></div>}/><FarmMap sectors={data.sectors} timezone={data.farm.timezone} selectedSectorId={data.selectedSectorId}/></div>}
