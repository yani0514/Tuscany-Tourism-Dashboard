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
    const grouped = df.groupby(["month_num"]).agg({
        italian_stays: "mean",
        foreign_stays: "mean",
        total_stays: "mean",
    });

    //order in ascending order - 01....12
    const sorted = grouped.sortValues("month_num", { ascending: true });
    return dfd.toJSON(sorted).map((row) => ({
        month_num: String(row.month_num).padStart(2, "0"),
        italian_avg: Number(row.italian_stays_mean.toFixed(2)),
        foreigners_avg: Number(row.foreign_stays_mean.toFixed(2)),
        total_avg: Number(row.total_stays_mean.toFixed(2)),
    }));
}