import * as ss from "simple-statistics";
import { EXCEL_12_COLS, EXCEL_15_COLS } from "../dataFromCSV/loadTourismCSV.js";

/**
 * Build per-column numeric arrays from the row objects.
 * If dropMissing = true, skip any row that has a missing/NaN value
 * in ANY of the selected columns.
 */
function buildColumnArrays(rows, columns, { dropMissing = false } = {}) {
  const colData = {};
  for (const col of columns) {
    colData[col] = [];
  }

  for (const row of rows) {
    const values = columns.map((col) => row[col]);

    const hasMissing = values.some(
      (v) =>
        v === null ||
        v === undefined ||
        Number.isNaN(Number(v))
    );

    if (dropMissing && hasMissing) {
      continue; // skip this row entirely
    }

    values.forEach((v, i) => {
      colData[columns[i]].push(Number(v));
    });
  }

  return colData;
}

/**
 * Compute a correlation matrix given column data and a correlation function.
 * corrFn: (x: number[], y: number[]) => number
 */
function computeCorrelationMatrix(columns, colData, corrFn) {
  const n = columns.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    const colI = columns[i];
    const xi = colData[colI];

    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }

      const colJ = columns[j];
      const xj = colData[colJ];

      // Just in case lengths differ (after dropMissing etc.)
      const len = Math.min(xi.length, xj.length);
      const xiTrim = xi.slice(0, len);
      const xjTrim = xj.slice(0, len);

      matrix[i][j] = corrFn(xiTrim, xjTrim);
    }
  }

  return {
    columns,       // column names (same order as matrix)
    values: matrix // 2D array: values[i][j] = corr(columns[i], columns[j])
  };
}

/**
 * Pearson Correlation (12 rows)
 * rows = normalized excel data array
 */
export function PCC_12(rows) {
  const colData = buildColumnArrays(rows, EXCEL_12_COLS, {
    dropMissing: false, // you said these 12 have no missing data
  });

  return computeCorrelationMatrix(EXCEL_12_COLS, colData, ss.sampleCorrelation);
}

/**
 * Pearson Correlation (15 rows, remove rows with missing values)
 */
export function PCC_15(rows) {
  const colData = buildColumnArrays(rows, EXCEL_15_COLS, {
    dropMissing: true,
  });

  return computeCorrelationMatrix(EXCEL_15_COLS, colData, ss.sampleCorrelation);
}

/**
 * Spearman Correlation (12 rows)
 * Spearman = Pearson on ranks; simple-statistics does that internally.
 */
export function SCC_12(rows) {
  const colData = buildColumnArrays(rows, EXCEL_12_COLS, {
    dropMissing: false,
  });

  return computeCorrelationMatrix(
    EXCEL_12_COLS,
    colData,
    ss.sampleRankCorrelation
  );
}

/**
 * Spearman Correlation (15 rows, remove rows with missing values)
 */
export function SCC_15(rows) {
  const colData = buildColumnArrays(rows, EXCEL_15_COLS, {
    dropMissing: true,
  });

  return computeCorrelationMatrix(
    EXCEL_15_COLS,
    colData,
    ss.sampleRankCorrelation
  );
}