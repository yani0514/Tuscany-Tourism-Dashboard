import fetch from "node-fetch";

const STATS_SERVICE_URL = process.env.STATS_SERVICE_URL || 8001;

export async function callLinearRegression(payload) {
  const res = await fetch(`${`http://localhost:`+ STATS_SERVICE_URL}/linear-regression`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stats service error (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Helper: build y and X from the CSV rows and column names.
 * rows: array of normalized CSV rows (from loadTourismCSV)
 * yCol: string, target column name (e.g. "stays_total")
 * xCols: array of predictor column names (e.g. ["arrivals_total", "coverage"])
 */
export async function runLinearRegressionFromRows(rows, yCol, xCols, modelName) {
  const y = rows.map((r) => r[yCol]);
  const X = {};

  for (const col of xCols) {
    X[col] = rows.map((r) => r[col]);
  }

  const payload = {
    model_name: modelName,
    y,
    X,
  };

  return callLinearRegression(payload);
}

/**
 * Same idea for GLM: call /glm with raw payload.
 */
export async function callGLM(payload) {
  const res = await fetch(`${`http://localhost:`+ STATS_SERVICE_URL}/generalized-linear-model`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stats service error (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * rows: CSV rows from loadTourismCSV()
 * yCol: target column name
 * xCols: predictor column names
 * family: "poisson" | "gaussian" | "binomial"
 * modelName: label to include in the result
 */
export async function runGLMFromRows(rows, yCol, xCols, family, modelName) {
  const y = rows.map((r) => r[yCol]);
  const X = {};

  for (const col of xCols) {
    X[col] = rows.map((r) => r[col]);
  }

  const payload = {
    model_name: modelName,
    family,
    y,
    X,
  };

  return callGLM(payload);
}

export async function runSeasonalityFromRows(rows, metricCol, outRoot = "exports/seasonality") {
  // send rows exactly in your format; python code adapts schema
  const response = await fetch(`${`http://localhost:`+ STATS_SERVICE_URL}/seasonality`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      metric_col: metricCol,
      rows,
      out_root: outRoot,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Seasonality service failed: ${response.status} ${text}`);
  }

  return response.json(); // { run_id, run_dir, results, ... }
}