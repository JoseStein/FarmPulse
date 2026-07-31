"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map, ListChecks, Droplets, ClipboardPlus, Wheat, CloudSun, CircleDollarSign, Package, Tractor, NotebookPen, BookOpen, BarChart3, Settings, Bell, Menu, Plus, X, Camera, Bug, Leaf, LogOut } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {signOut} from "next-auth/react";

const nav = [
  ["Dashboard","/dashboard",LayoutDashboard],["Farm Map","/map",Map],["Tasks","/tasks",ListChecks],["Irrigation","/irrigation",Droplets],["Activities","/activities",ClipboardPlus],["Crop Cycle","/crop-cycle",Wheat],["Weather","/weather",CloudSun],["Expenses","/expenses",CircleDollarSign],["Inventory","/inventory",Package],["Equipment","/equipment",Tractor],["Field Journal","/journal",NotebookPen],["Corn Guide","/guide",BookOpen],["Reports","/reports",BarChart3],["Settings","/settings",Settings]
] as const;
const mobile = [["Home","/dashboard",LayoutDashboard],["Map","/map",Map],["Tasks","/tasks",ListChecks],["More","/settings",Menu]] as const;
type ShellData={user:{id:string;name:string;email:string;role:"ADMIN"|"OPERATOR"};farm:{id:string;name:string};field:{id:string;name:string};crop:string;taskCount:number;notificationCount:number};
const operatorRoutes=new Set(["/dashboard","/map","/tasks","/irrigation","/activities","/weather","/journal","/guide"]);
export function AppShell({ children,data }: {children:React.ReactNode;data:ShellData}) {
  const path=usePathname(); const [sheet,setSheet]=useState(false);
  const visibleNav=data.user.role==="ADMIN"?nav:nav.filter(([,href])=>operatorRoutes.has(href));
  const initials=data.user.name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
  return <div className="min-h-screen">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] border-r bg-white md:flex md:flex-col">
      <div className="px-5 py-6"><Logo/></div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">{visibleNav.map(([label,href,Icon])=><Link key={href} href={href} className={cn("mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#587066] hover:bg-farm-50 hover:text-farm-900",path===href&&"bg-farm-50 text-farm-900")}><Icon size={18}/>{label}{label==="Tasks"&&data.taskCount>0&&<span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{data.taskCount}</span>}</Link>)}</nav>
      <div className="border-t p-4"><div className="flex items-center gap-3 rounded-xl bg-[#f7f9f6] p-3"><div className="grid size-9 place-items-center rounded-full bg-[#dcebdd] text-sm font-bold text-farm-700">{initials}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{data.user.name}</p><p className="text-xs text-slate-500">{data.user.role==="ADMIN"?"Administrator":"Operator"}</p></div><button onClick={()=>signOut({callbackUrl:"/login"})} className="ml-auto text-slate-400 hover:text-red-600" aria-label="Sign out"><LogOut size={16}/></button></div></div>
    </aside>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur md:ml-[244px] md:px-8"><div className="md:hidden"><Logo/></div><div className="hidden md:block"><p className="text-xs font-medium text-slate-500">{data.farm.name}</p><p className="text-sm font-semibold">{data.field.name} · {data.crop}</p></div><div className="flex items-center gap-2"><button className="relative grid size-10 place-items-center rounded-xl border bg-white" aria-label={`${data.notificationCount} unread notifications`}><Bell size={19}/>{data.notificationCount>0&&<span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500"/>}</button><div className="grid size-10 place-items-center rounded-full bg-farm-100 text-sm font-bold text-farm-700 md:hidden">{initials}</div></div></header>
    <main className="pb-24 md:ml-[244px] md:pb-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[74px] grid-cols-5 border-t bg-white px-2 pb-[env(safe-area-inset-bottom)] md:hidden">{mobile.slice(0,3).map(([label,href,Icon])=><Link key={href} href={href} className={cn("flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500",path===href&&"text-farm-700")}><Icon size={21}/>{label}</Link>)}<button onClick={()=>setSheet(true)} className="relative flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-farm-700"><span className="absolute -top-5 grid size-14 place-items-center rounded-full border-4 border-white bg-farm-700 text-white shadow-lg"><Plus size={26}/></span><span className="mt-8">Log</span></button><Link href={data.user.role==="ADMIN"?"/settings":"/guide"} className={cn("flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500",(path==="/settings"||path==="/guide")&&"text-farm-700")}><Menu size={21}/>More</Link></nav>
    {sheet&&<div className="fixed inset-0 z-50 bg-black/40" onClick={()=>setSheet(false)}><div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-9" onClick={e=>e.stopPropagation()}><div className="mb-5 flex items-center justify-between"><div><p className="text-lg font-bold">Quick log</p><p className="text-sm text-slate-500">What happened in the field?</p></div><button onClick={()=>setSheet(false)} className="grid size-10 place-items-center rounded-full bg-slate-100"><X/></button></div><div className="grid grid-cols-2 gap-3">{[["Irrigated now",Droplets,"/activities?type=irrigation"],["Field note",NotebookPen,"/journal?new=1"],["Fertilizer",Leaf,"/activities?type=fertilizer"],["Pest inspection",Bug,"/activities?type=pest"],["Upload photo",Camera,"/journal?new=1"],["Other activity",Plus,"/activities"]].map(([l,I,h])=><Link href={h as string} key={l as string} onClick={()=>setSheet(false)} className="flex min-h-20 items-center gap-3 rounded-2xl border bg-[#fafbf9] p-3 font-semibold"><span className="grid size-10 place-items-center rounded-xl bg-farm-100 text-farm-700"><I size={20}/></span>{l as string}</Link>)}</div></div></div>}
  </div>
}
