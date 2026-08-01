import {PageHeader} from "@/components/ui";
import {WeatherView} from "@/components/weather-view";
import {getActiveFarm} from "@/lib/data/queries";
export const metadata={title:"Weather"};
export default async function Page(){const farm=await getActiveFarm();return <div className="mx-auto max-w-6xl p-4 md:p-8"><PageHeader eyebrow="Operational decision support" title={`Weather at ${farm.locationName??farm.name}`} description={`Live Open-Meteo conditions for ${farm.latitude.toFixed(5)}, ${farm.longitude.toFixed(5)}, with durable fallback to the latest saved farm snapshot.`}/><WeatherView timezone={farm.timezone} unitSystem={farm.unitSystem}/></div>}
