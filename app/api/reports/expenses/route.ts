import {csvRow} from "@/lib/csv";
import {getExpenseData} from "@/lib/data/queries";

export async function GET(request: Request) {
  try {
    const url=new URL(request.url); const from=url.searchParams.get("from"); const to=url.searchParams.get("to");
    const data=await getExpenseData({category:url.searchParams.get("category")||undefined,sectorId:url.searchParams.get("sector")||undefined,from:from?new Date(`${from}T00:00:00Z`):undefined,to:to?new Date(`${to}T23:59:59Z`):undefined});
    const lines=[csvRow(["Date","Vendor","Description","Category","Amount","Currency","Field sector","Quantity","Unit cost","Entered by","Notes"]),...data.rows.map(row=>csvRow([row.date.slice(0,10),row.vendor,row.description,row.category,row.amount,row.currency,row.sector?.name,row.quantity,row.unitCost,row.enteredBy.name,row.notes]))];
    return new Response(`\uFEFF${lines.join("\r\n")}`,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=farmpulse-expenses.csv","Cache-Control":"private, no-store"}});
  } catch { return new Response("Unable to export expenses.",{status:403}); }
}
