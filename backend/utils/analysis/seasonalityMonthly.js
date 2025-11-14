import * as dfd from "danfojs";

/**2) Seasonality / monthly trends (aggregate across all areas & years)
 * - For each month number (01..12), compute average Italians, Foreigners, Total
 *   This reveals *typical* month pattern (seasonality).
 * @param {Array} rows
 * @returns
 */

export default function seasonalityMonthly(rows) {
  //Display the dataset as DataFrame
  const df = new dfd.DataFrame(rows);

  //Group by month and compute the mean for all of them
  const grouped = df.groupby(["year", "month_num"]).agg({
    italian_stays: "mean",
    foreign_stays: "mean",
    total_stays: "mean",
  });

  //Convert to plain JS objects
  const groupedAsJson = dfd.toJSON(grouped);

  //Sort in JS by year, then month_num
  groupedAsJson.sort((a, b) => {
    const ya = Number(a.year);
    const yb = Number(b.year);
    if (ya !== yb) return ya - yb;

    const ma = Number(a.month_num);
    const mb = Number(b.month_num);
    return ma - mb;
  });

  return groupedAsJson.map((row) => ({
    year: String(row.year),
    month_num: String(row.month_num).padStart(2, "0"),
    italian_avg: Number(row.italian_stays_mean.toFixed(2)),
    foreigners_avg: Number(row.foreign_stays_mean.toFixed(2)),
    total_avg: Number(row.total_stays_mean.toFixed(2)),
  }));
}