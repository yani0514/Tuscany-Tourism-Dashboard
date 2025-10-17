import * as dfd from "danfojs";

/** 4) Italian vs Foreign dominance ratio per area
 * - Aggregate sums per area (over all months/years in dataset)
 * - ratio = italians / foreigners
 * - also return shares (%) for context
 * @param {Array} rows 
 * @returns 
 */
export default function dominanceRatio(rows) {
    //Display the dataset as DataFrame
    const df = new dfd.DataFrame(rows);

    //Aggregate sums per area (over all months/ years in the dataset)
    const grouped = df.groupby(["area"]).agg({
        italian_stays: "sum",
        foreign_stays: "sum",
        total_stays: "sum",
    });

    //return the shared percentage for both italians and foreigners
    return dfd
        .toJSON(grouped)
        .map((row) => {
            const italians = Number(row.italian_stays_sum);
            const foreigners = Number(row.foreign_stays_sum);
            const total = Number(row.total_stays_sum) || italians + foreigners;
            const ratio = Number(div(italians, foreigners).toFixed(2));  // >1 => domestic-dominant; <1 => foreign-dominant
            const italianShare = total ? (italians / total) * 100 : null;
            const foreignShare = total ? (foreigners / total) * 100 : null;
            return {
                area: row.area,
                italians,
                foreigners,
                ratio,
                italianSharePercent: Number(italianShare.toFixed(2)),
                foreignSharePercent: Number(foreignShare.toFixed(2)),
            };
        })
        .sort((a, b) => (b.ratio ?? -Infinity) - (a.ratio ?? -Infinity));
}

function div(a, b) {
    const x = Number(a ?? 0);
    const y = Number(b ?? 0);

    if (y == 0) {
        return null;
    } else {
        return x / y;
    }
}