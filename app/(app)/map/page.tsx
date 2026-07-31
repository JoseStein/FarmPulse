import {FarmMap} from "@/components/farm-map";
import {PageHeader} from "@/components/ui";
import {getSectorSummaries} from "@/lib/data/queries";
import {MapPin} from "lucide-react";
export const metadata={title:"Farm map"};
export default async function MapPage(){const data=await getSectorSummaries();return <div className="mx-auto max-w-[1400px] p-4 md:p-8"><PageHeader eyebrow={data.farm.name} title={`${data.field.name} map`} description={`${data.field.areaHa.toFixed(2)} hectare · ${String(data.design.rowLengthM??100)} × ${String(data.design.rowLengthM??100)} m · ${String(data.design.rows??133)} crop rows · ${data.sectors.length} irrigation sectors`} action={<span className="btn-secondary desktop-only"><MapPin size={17}/>{data.farm.latitude.toFixed(2)}° N, {Math.abs(data.farm.longitude).toFixed(2)}° W</span>}/><FarmMap sectors={data.sectors} crop={data.cycle.crop} timezone={data.farm.timezone}/></div>}
