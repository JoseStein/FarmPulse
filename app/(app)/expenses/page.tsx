import {ExpensesView} from "@/components/expenses-view";
import {PageHeader} from "@/components/ui";
import {getExpensePageData} from "@/lib/data/queries";

export const metadata={title:"Expenses"};
export default async function ExpensesPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const p=await searchParams; const data=await getExpensePageData({category:p.category,sectorId:p.sector,from:p.from?new Date(`${p.from}T00:00:00Z`):undefined,to:p.to?new Date(`${p.to}T23:59:59Z`):undefined});
  return <div className="mx-auto max-w-6xl p-4 md:p-8"><PageHeader eyebrow="Cost management" title="Expenses & budget" description="Actual PostgreSQL records are separated from planned budget values."/><ExpensesView data={data} startNew={p.new==="1"}/></div>;
}
