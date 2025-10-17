import { parseISO, format } from "date-fns";

// Convert raw Redash rows (Italian keys) to clean English keys
export function normalizeTourismData(rawRows = []) {
  return rawRows.map(r => {
    const dateStr = r.data ?? null;
    const dateObj = dateStr ? parseISO(dateStr) : null;

    const year = String(r.anno ?? "");
    const month_num = String(r.mese ?? "").padStart(2, "0"); // "01".."12"
    const month = dateObj ? format(dateObj, "yyyy-MM") : `${year}-${month_num}`; // "YYYY-MM"

    const italian_stays = Number(r.presenze_italiani ?? 0);
    const foreign_stays = Number(r.presenze_stranieri ?? 0);

    return {
      year,                // "2025"
      month_num,           // "05"
      month,               // "2025-05" (great for grouping & sorting)
      date: dateStr,       // "2025-05-01"
      area: r["ambito::filter"] ?? r.ambito ?? "Unknown",
      italian_stays,
      foreign_stays,
      total_stays: italian_stays + foreign_stays,
    };
  });
}