export function cn(...parts: Array<string | false | null | undefined>) { return parts.filter(Boolean).join(" "); }
export const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
export const hectaresToAcres = (v: number) => v * 2.47105;
export const metersToFeet = (v: number) => v * 3.28084;
export const millimetersToInches = (v: number) => v / 25.4;
export const litersToGallons = (v: number) => v * 0.264172;
export const cubicMetersHourToGpm = (v: number) => v * 4.40287;
export const barToPsi = (v: number) => v * 14.5038;
export function budgetSummary(planned: number, expenses: number[]) { const actual = expenses.reduce((a,b)=>a+b,0); return { planned, actual, remaining: planned-actual, variance: planned-actual, percentUsed: planned ? (actual/planned)*100 : 0 }; }
export type IrrigationInput = { hoursSinceIrrigation: number; rainLast24Mm: number; forecastRain24Mm: number; stage: string; moisturePercent?: number };
export function irrigationRecommendation(i: IrrigationInput) {
  if (i.forecastRain24Mm >= 10) return { type: "SKIP_RAIN", title: "Consider delaying irrigation", reason: `${i.forecastRain24Mm} mm of rain is forecast within 24 hours.`, action: "Inspect field moisture before irrigating." };
  if (i.rainLast24Mm >= 8) return { type: "DELAY", title: "Monitor before irrigating", reason: `${i.rainLast24Mm} mm of rain was recorded recently.`, action: "Check soil moisture in the root zone." };
  if (i.moisturePercent !== undefined && i.moisturePercent < 25) return { type: "IRRIGATE_TODAY", title: "Irrigation may be needed today", reason: `Soil moisture is ${i.moisturePercent}% and below the pilot threshold.`, action: "Confirm in the field, then irrigate if needed." };
  if (i.hoursSinceIrrigation >= 72) return { type: "IRRIGATE_TODAY", title: "Irrigation may be due", reason: `It has been ${Math.floor(i.hoursSinceIrrigation/24)} days since irrigation.`, action: "Inspect the sector and irrigate if soil is dry." };
  return { type: "MONITOR", title: "Monitor field moisture", reason: "Recent irrigation and rainfall do not trigger a pilot rule.", action: "Continue routine field checks." };
}
