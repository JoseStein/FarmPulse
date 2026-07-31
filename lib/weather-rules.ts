export type WeatherDay={date:string;temperatureMaxC:number|null;temperatureMinC:number|null;precipitationMm:number;rainProbability:number};
export function weatherNotices(days:WeatherDay[],current:{temperatureC:number|null;windKph:number|null}){
  const notices:Array<{title:string;message:string;severity:"LOW"|"MEDIUM"|"HIGH"}>=[];const tomorrow=days[1];
  if(tomorrow?.rainProbability>=50)notices.push({title:"Rain expected tomorrow",message:`${tomorrow.rainProbability}% probability and ${tomorrow.precipitationMm} mm forecast. Consider field access and irrigation timing.`,severity:"MEDIUM"});
  if(days.some(d=>d.precipitationMm>=25))notices.push({title:"Heavy rainfall risk",message:"Inspect drainage and consider postponing fertilizer before the highest-rainfall period.",severity:"HIGH"});
  if((current.temperatureC??0)>=35)notices.push({title:"High-temperature warning",message:"Review worker heat precautions and inspect crop water stress.",severity:"HIGH"});
  if((current.windKph??0)>=35)notices.push({title:"Strong-wind warning",message:"Secure loose equipment and avoid spray work until field conditions are suitable.",severity:"HIGH"});
  if(!notices.length&&days.slice(0,2).every(d=>d.rainProbability<35))notices.push({title:"Potential field-work window",message:"Lower rain probability may support planned field work; confirm conditions locally.",severity:"LOW"});
  return notices;
}

