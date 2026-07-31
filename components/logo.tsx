import { Sprout } from "lucide-react";
export function Logo({ compact=false }: {compact?:boolean}) { return <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-farm-700 text-white"><Sprout size={20}/></span>{!compact&&<span className="text-xl font-bold tracking-tight">Farm<span className="text-farm-600">Pulse</span></span>}</div> }
