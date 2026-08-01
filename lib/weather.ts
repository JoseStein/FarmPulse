import "server-only";
import {prisma} from "@/lib/prisma";
import {requireFarmContext} from "@/lib/data/context";
import {decimal} from "@/lib/data/serialize";
import {weatherNotices,type WeatherDay} from "@/lib/weather-rules";
import {fromZonedTime} from "date-fns-tz";

export type WeatherResult={source:"live"|"database-cache"|"fallback";stale:boolean;updatedAt:string;location?:{name:string;latitude:number;longitude:number};current:{temperatureC:number|null;apparentTemperatureC:number|null;humidityPct:number|null;windKph:number|null;precipitationMm:number|null;weatherCode:number|null};daily:WeatherDay[];notices:ReturnType<typeof weatherNotices>;message?:string};

function normalizedFromPayload(payload:unknown):WeatherResult|null{if(!payload||typeof payload!=="object")return null;const p=payload as Record<string,unknown>;return p.normalized&&typeof p.normalized==="object"?p.normalized as WeatherResult:null}

export async function getFarmWeather({forceRefresh=false}:{forceRefresh?:boolean}={}):Promise<WeatherResult>{
  const {farm}=await requireFarmContext();
  try{
    const url=new URL("https://api.open-meteo.com/v1/forecast");url.search=new URLSearchParams({latitude:String(farm.latitude),longitude:String(farm.longitude),current:"temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",daily:"precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min",timezone:farm.timezone,forecast_days:"7"}).toString();
    const response=await fetch(url,forceRefresh?{cache:"no-store",signal:AbortSignal.timeout(8000)}:{next:{revalidate:900},signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error("provider error");const raw=await response.json() as {current?:Record<string,number|string>;daily?:Record<string,Array<string|number>>};const current=raw.current??{},dailyRaw=raw.daily??{};
    const daily:WeatherDay[]=((dailyRaw.time??[]) as string[]).map((date,i)=>({date,temperatureMaxC:Number(dailyRaw.temperature_2m_max?.[i]??0),temperatureMinC:Number(dailyRaw.temperature_2m_min?.[i]??0),precipitationMm:Number(dailyRaw.precipitation_sum?.[i]??0),rainProbability:Number(dailyRaw.precipitation_probability_max?.[i]??0)}));
    const providerTime=typeof current.time==="string"?fromZonedTime(current.time,farm.timezone):new Date();
    const result:WeatherResult={source:"live",stale:false,updatedAt:providerTime.toISOString(),location:{name:farm.locationName??farm.name,latitude:Number(farm.latitude),longitude:Number(farm.longitude)},current:{temperatureC:Number(current.temperature_2m??0),apparentTemperatureC:Number(current.apparent_temperature??0),humidityPct:Number(current.relative_humidity_2m??0),windKph:Number(current.wind_speed_10m??0),precipitationMm:Number(current.precipitation??0),weatherCode:Number(current.weather_code??0)},daily,notices:[]};result.notices=weatherNotices(daily,result.current);
    const latest=await prisma.weatherSnapshot.findFirst({where:{farmId:farm.id},orderBy:{observedAt:"desc"},select:{observedAt:true}});if(!latest||providerTime.getTime()>latest.observedAt.getTime())await prisma.weatherSnapshot.create({data:{farmId:farm.id,observedAt:providerTime,temperatureC:result.current.temperatureC,humidityPct:result.current.humidityPct,windKph:result.current.windKph,precipitationMm:result.current.precipitationMm,rainProbability:daily[0]?.rainProbability,payload:{normalized:result,forecastRain24Mm:daily[1]?.precipitationMm??0}}});
    return result;
  }catch{
    const cached=await prisma.weatherSnapshot.findFirst({where:{farmId:farm.id},orderBy:{observedAt:"desc"}});const normalized=normalizedFromPayload(cached?.payload);if(normalized)return {...normalized,source:"database-cache",stale:true,updatedAt:cached!.observedAt.toISOString(),message:"The weather provider is unavailable. Showing the latest saved forecast."};
    const current={temperatureC:decimal(cached?.temperatureC),apparentTemperatureC:null,humidityPct:cached?.humidityPct??null,windKph:decimal(cached?.windKph),precipitationMm:decimal(cached?.precipitationMm),weatherCode:null};const daily:WeatherDay[]=[];return {source:"fallback",stale:true,updatedAt:cached?.observedAt.toISOString()??new Date().toISOString(),location:{name:farm.locationName??farm.name,latitude:Number(farm.latitude),longitude:Number(farm.longitude)},current,daily,notices:weatherNotices(daily,current),message:"Live weather is unavailable. Showing the latest saved observation where available."};
  }
}
