export const sectors = [
  { id:"sector-1", name:"Sector 1", lines:33, status:"Healthy", tone:"healthy", last:"Today, 6:20 AM", next:"Scout emergence", alerts:0 },
  { id:"sector-2", name:"Sector 2", lines:33, status:"Irrigation due", tone:"due", last:"3 days ago", next:"Irrigate today", alerts:1 },
  { id:"sector-3", name:"Sector 3", lines:34, status:"Attention needed", tone:"attention", last:"Yesterday", next:"Inspect leak", alerts:2 },
  { id:"sector-4", name:"Sector 4", lines:33, status:"Healthy", tone:"healthy", last:"Yesterday", next:"Pest inspection", alerts:0 },
];
export const tasks = [
  { id:1, title:"Irrigate Sector 2", meta:"Irrigation · 7:00 AM", status:"Due today", priority:"High", sector:"Sector 2" },
  { id:2, title:"Inspect reported drip-line leak", meta:"Maintenance · 9:30 AM", status:"Overdue", priority:"Critical", sector:"Sector 3" },
  { id:3, title:"Scout seedling emergence", meta:"Field inspection · 3:00 PM", status:"Due today", priority:"Medium", sector:"All sectors" },
  { id:4, title:"Check fertilizer inventory", meta:"Inventory · Tomorrow", status:"Planned", priority:"Low", sector:"Farm" },
];
export const activities = [
  { icon:"water", title:"Irrigation completed", detail:"Sector 1 · 62 min · 11,367 L", time:"Today, 7:22 AM" },
  { icon:"note", title:"Emergence field note", detail:"Sector 4 · Stand looks even", time:"Yesterday, 4:16 PM" },
  { icon:"tool", title:"Filter cleaned", detail:"Main irrigation filter", time:"Yesterday, 10:40 AM" },
  { icon:"rain", title:"Rainfall recorded", detail:"4.2 mm at Field 1", time:"Jul 29, 6:10 PM" },
];
export const expenses = [
  { date:"Jul 28", description:"Nitrogen fertilizer", vendor:"Agro Panamá", category:"Fertilizer", amount:420 },
  { date:"Jul 24", description:"Field labor", vendor:"Local crew", category:"Labor", amount:280 },
  { date:"Jul 20", description:"Pump fuel", vendor:"Terpel", category:"Fuel", amount:96 },
  { date:"Jul 12", description:"Corn seed", vendor:"Semillas del Istmo", category:"Seed", amount:640 },
];
export const guideArticles = [
  { title:"Scout seedling emergence", category:"Field scouting", stage:"Seedling", summary:"Walk a consistent pattern and record gaps, uneven emergence, insects, and standing water.", priority:"Now" },
  { title:"Irrigation during establishment", category:"Irrigation", stage:"Germination · Seedling", summary:"Keep the seed zone adequately moist without creating saturated areas. Confirm conditions in the field.", priority:"Current stage" },
  { title:"Drainage after heavy rain", category:"Soil & drainage", stage:"All stages", summary:"Inspect low areas and outlets after rainfall. Prolonged saturation can reduce root-zone oxygen.", priority:"Weather related" },
  { title:"Early-season pest check", category:"Pests", stage:"Seedling", summary:"Look for cut plants, leaf feeding, frass, and uneven patches. Photograph and record affected areas.", priority:"Checklist" },
];
