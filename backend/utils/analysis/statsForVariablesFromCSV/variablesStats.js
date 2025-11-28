// src/stats/variableStats.js
import * as ss from "simple-statistics";

/**
 * Compute Type, Min, Max, Std, Avg, Median
 * for all NUMERIC columns in `rows`.
 * Non-numeric columns are skipped.
 */
export default function computeNumericColumnStats(rows) {
  if (!rows || rows.length === 0) return [];

  const columns = Object.keys(rows[0]); // all column names
  const summaries = [];

  for (const col of columns) {
    const rawValues = rows
      .map((row) => row[col])
      .filter((value) => value !== null && value !== undefined && value !== "");

    // Try to convert to numbers and drop NaNs
    const numericValues = rawValues
      .map((value) => Number(value))
      .filter((valueType) => !Number.isNaN(valueType));

    // If we couldn't get any numeric value, skip this column
    if (numericValues.length === 0) {
      continue;
    }

    summaries.push({
      name: col,
      type: "numeric",
      min: ss.min(numericValues),
      max: ss.max(numericValues),
      std: ss.standardDeviation(numericValues).toFixed(2),
      avg: ss.mean(numericValues).toFixed(2),
      median: ss.median(numericValues),
    });
  }

  return summaries;
}