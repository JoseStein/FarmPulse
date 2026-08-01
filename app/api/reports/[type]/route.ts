import { csvRow } from "@/lib/csv";
import { getReports } from "@/lib/data/queries";

type Rows = { headers: string[]; rows: unknown[][] };
export async function GET(_: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    const d = await getReports();
    let exportData: Rows;
    switch (type) {
      case "crop-cycle":
        exportData = {
          headers: [
            "Crop",
            "Variety",
            "Stage",
            "Status",
            "Planting date",
            "Expected harvest",
            "Population target",
            "Expected yield kg",
            "Actual yield kg",
          ],
          rows: [
            [
              d.cycle.crop.name,
              d.cycle.variety,
              d.cycle.growthStage?.name,
              d.cycle.status,
              d.cycle.actualPlantingDate || d.cycle.plannedPlantingDate,
              d.cycle.expectedHarvestDate,
              d.cycle.populationTarget,
              d.cycle.expectedYieldKg,
              d.cycle.actualYieldKg,
            ],
          ],
        };
        break;
      case "activities":
        exportData = {
          headers: ["Date", "Type", "Sector", "Worker", "Product", "Quantity", "Unit", "Cost", "Notes"],
          rows: d.activities.map((x) => [
            x.occurredAt,
            x.type,
            x.sector?.name,
            x.worker,
            x.productUsed,
            x.quantity,
            x.unit,
            x.cost,
            x.notes,
          ]),
        };
        break;
      case "irrigation":
        exportData = {
          headers: [
            "Started",
            "Sector",
            "Duration minutes",
            "Flow m3/h",
            "Estimated liters",
            "Pressure bar",
            "Operator",
            "Notes",
          ],
          rows: d.irrigation.map((x) => [
            x.startedAt,
            x.sector.name,
            x.durationMinutes,
            x.flowM3h,
            x.estimatedLiters,
            x.pressureBar,
            x.operator,
            x.notes,
          ]),
        };
        break;
      case "expenses":
        exportData = {
          headers: [
            "Date",
            "Vendor",
            "Description",
            "Category",
            "Sector",
            "Amount",
            "Currency",
            "Quantity",
            "Unit cost",
            "Entered by",
            "Notes",
          ],
          rows: d.expenses.rows.map((x) => [
            x.date,
            x.vendor,
            x.description,
            x.category,
            x.sector?.name,
            x.amount,
            x.currency,
            x.quantity,
            x.unitCost,
            x.enteredBy.name,
            x.notes,
          ]),
        };
        break;
      case "cost-by-category":
        exportData = {
          headers: ["Category", "Amount", "Currency"],
          rows: d.expenses.byCategory.map((x) => [x.category, x.amount, d.expenses.currency]),
        };
        break;
      case "cost-by-sector":
        exportData = {
          headers: ["Sector ID", "Amount", "Currency"],
          rows: d.expenses.bySector.map((x) => [x.sectorId || "Unassigned", x.amount, d.expenses.currency]),
        };
        break;
      case "inventory":
        exportData = {
          headers: [
            "Name",
            "Category",
            "Quantity",
            "Unit",
            "Minimum threshold",
            "Unit cost",
            "Supplier",
            "Location",
            "Expiration",
          ],
          rows: d.inventory.items.map((x) => [
            x.name,
            x.category,
            x.quantityOnHand,
            x.unit,
            x.minimumThreshold,
            x.unitCost,
            x.supplier,
            x.storageLocation,
            x.expirationDate,
          ]),
        };
        break;
      case "tasks":
        exportData = {
          headers: [
            "Task",
            "Category",
            "Priority",
            "Status",
            "Due",
            "Sector",
            "Assigned to",
            "Completed at",
            "Completed by",
            "Completion notes",
          ],
          rows: d.tasks.map((x) => [
            x.name,
            x.category,
            x.priority,
            x.status,
            x.dueAt,
            x.sector?.name,
            x.assignedUser?.name,
            x.completedAt,
            x.completedBy?.name,
            x.completionNotes,
          ]),
        };
        break;
      case "equipment":
        exportData = {
          headers: [
            "Name",
            "Type",
            "Status",
            "Manufacturer",
            "Model",
            "Runtime hours",
            "Last maintenance",
            "Next maintenance",
          ],
          rows: d.equipment.items.map((x) => [
            x.name,
            x.type,
            x.status,
            x.manufacturer,
            x.model,
            x.runtimeHours,
            x.lastMaintenance,
            x.nextMaintenance,
          ]),
        };
        break;
      case "profitability": {
        const available = d.cycle.actualYieldKg != null;
        exportData = {
          headers: ["Crop", "Actual yield kg", "Recorded costs", "Revenue", "Profit", "Currency", "Status"],
          rows: [
            [
              d.cycle.crop.name,
              d.cycle.actualYieldKg,
              d.expenses.totals.actual,
              "",
              "",
              d.expenses.currency,
              available ? "Revenue data not yet modeled" : "Unavailable until harvest and sales data exist",
            ],
          ],
        };
        break;
      }
      default:
        return new Response("Unknown report type.", { status: 404 });
    }
    const content = [csvRow(exportData.headers), ...exportData.rows.map(csvRow)].join("\r\n");
    return new Response(`\uFEFF${content}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=farmpulse-${type}.csv`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Unable to export report.", { status: 403 });
  }
}
