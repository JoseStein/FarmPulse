import {getReports} from "@/lib/data/queries";
import {PageHeader,Metric} from "@/components/ui";
import {Download,FileSpreadsheet,ChartNoAxesColumn} from "lucide-react";
export const metadata={title:"Reports"};
export default async function ReportsPage(){const data=await getReports();const reports=[
 ["crop-cycle","Crop-cycle summary",`${data.cycle.crop.name} · ${data.cycle.growthStage?.name??"Stage not set"}`],
 ["activities","Activity history",`${data.activities.length} recent records`],
 ["irrigation","Irrigation history",`${data.irrigation.length} recent events`],
 ["expenses","Expense detail",`${data.expenses.currency} ${data.expenses.totals.actual.toLocaleString()}`],
 ["cost-by-category","Cost by category",`${data.expenses.byCategory.length} categories`],
 ["cost-by-sector","Cost by sector",`${data.expenses.bySector.length} sectors with costs`],
 ["inventory","Inventory status",`${data.inventory.lowStockCount} low-stock items`],
 ["tasks","Task completion",`${data.tasks.filter(t=>t.status==="COMPLETED").length} completed`],
 ["equipment","Equipment maintenance",`${data.equipment.items.length} assets`],
 ["profitability","Harvest & profitability",data.cycle.actualYieldKg?`${data.cycle.actualYieldKg.toLocaleString()} kg harvested`:"Awaiting harvest data"],
 ];return <div className="mx-auto max-w-5xl p-4 md:p-8"><PageHeader eyebrow="Analysis & export" title="Reports" description="Live, farm-scoped pilot records with spreadsheet-safe CSV exports."/><div className="mb-5 grid gap-3 sm:grid-cols-3"><Metric label="Activities" value={String(data.activities.length)} note="Most recent records"/><Metric label="Recorded cost" value={`${data.expenses.currency} ${data.expenses.totals.actual.toLocaleString()}`} note="Active crop cycle"/><Metric label="Irrigation" value={`${data.irrigation.reduce((s,x)=>s+x.estimatedLiters,0).toLocaleString()} L`} note="Recent exported events"/></div><div className="grid gap-4 sm:grid-cols-2">{reports.map(([id,title,sub],i)=><article className="card flex items-center gap-4 p-5" key={id}><span className="grid size-11 place-items-center rounded-xl bg-farm-50 text-farm-700">{i<6?<ChartNoAxesColumn size={20}/>:<FileSpreadsheet size={20}/>}</span><div className="flex-1"><h2 className="font-semibold">{title}</h2><p className="text-xs text-slate-500">{sub}</p></div><a href={`/api/reports/${id}`} className="grid size-11 place-items-center rounded-xl border hover:bg-farm-50" aria-label={`Export ${title}`}><Download size={17}/></a></article>)}</div><p className="mt-5 text-sm text-slate-500">CSV exports contain the live database rows visible to your authenticated farm membership. PDF is a future enhancement.</p></div>}
