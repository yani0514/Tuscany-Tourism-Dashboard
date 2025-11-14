import * as dfd from "danfojs";

/** 6) KPIs over Tuscany monthly totals
 * - First aggregate "Tuscany total" per month (sum across areas)
 * - Then compute:
 *   TTS (Total Tourist Stays over dataset),
 *   AMS (Average Monthly Stays),
 *   Max Monthly Stays, Min Monthly Stays
 * @param {Array} rows 
 * @returns 
 */
export default function KPIs(rows) {
    //Display the dataset as DataFrame 
    const df = new dfd.DataFrame(rows);

    //Aggregate montly sum (sum per YYYY-MM)
    const groupedByMonth = df.groupby(["month"]).agg({
        total_stays: "sum",
    }).sortValues("month");

    const seq = dfd.toJSON(groupedByMonth).map(row => Number(row.total_stays_sum));

    const TTS = seq.reduce((a, b) => a + b, 0);                // sum over months
    const AMS = seq.length ? TTS / seq.length : null;          // average per month
    const max = seq.length ? Math.max(...seq) : null;
    const min = seq.length ? Math.min(...seq) : null;

    // useful to return the month labels for max/min
    const rowsBM = dfd.toJSON(groupedByMonth);
    const idxMax = seq.indexOf(max);
    const idxMin = seq.indexOf(min);
    const monthMax = idxMax >= 0 ? rowsBM[idxMax].month : null;
    const monthMin = idxMin >= 0 ? rowsBM[idxMin].month : null;

    return {
    totalTouristStays: TTS,
    averageMonthlyStays: Number(AMS.toFixed(0)),
    maxMonthlyStays: max,
    maxMonthlyLabel: monthMax, // e.g., "2024-08"
    minMonthlyStays: min,
    minMonthlyLabel: monthMin,
  };
}