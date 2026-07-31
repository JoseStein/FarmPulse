import {InventoryView} from "@/components/inventory-view";
import {PageHeader} from "@/components/ui";
import {getInventory} from "@/lib/data/queries";
export const metadata={title:"Inventory"};
export default async function Page(){const data=await getInventory();return <div className="mx-auto max-w-6xl p-4 md:p-8"><PageHeader eyebrow="Supplies" title="Inventory" description="Live stock, adjustments, usage history, and low-stock thresholds."/><InventoryView data={data}/></div>}
