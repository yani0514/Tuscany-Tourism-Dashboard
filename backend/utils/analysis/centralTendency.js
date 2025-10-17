import * as dfd from "danfojs";

/** 1) Central tendency per area
 * - mean, std, median of total_stays (monthly) for each area

 */
export default function centralTendency(rows) {
    //Display the dataset as DataFrame
    const df = new dfd.DataFrame(rows);

    // Group by area and compute mean, std, median
    const grouped = df.groupby(["area"]).agg({
        total_stays: ["mean", "std", "median"],
    });

    return dfd.toJSON(grouped).map((row) => ({
        area: row.area,
        mean: Number(row.total_stays_mean.toFixed(1)),
        std: Number(row.total_stays_std.toFixed(2)),
        median: Number(row.total_stays_median),
    }));
}