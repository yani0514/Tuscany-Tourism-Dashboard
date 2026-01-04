/**
 * Tuscany Tourism Dashboard — Backend
 *
 * Exposes a single set of HTTP endpoints under /tourism that serve Tourism data
 * fetched from Redash. The service keeps a short-lived in-memory cache to
 * minimize latency and avoid hammering the upstream Redash API.
 *
 * Runtime model:
 *  1) On startup, load environment vars and warm the cache by fetching the
 *     full Redash envelope once. If that fails, the app still starts but
 *     endpoints that need data reply 503 until the next successful refresh.
 *  2) Each request either returns the cached copy (if fresh) or fetches a new
 *     and replaces the cache. The cache stores the *entire* Redash envelope,
 *     not just its rows, so clients can diagnose upstream shape changes.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetchTourismData from "./utils/dataFromAPI/fetchTourismAPI.js"; // async fn: fetches Redash JSON envelope
import { normalizeTourismData } from "./utils/dataFromAPI/normalizeTourismData.js"; // maps raw rows → normalized rows
import { loadTourismCSV } from "./utils/dataFromCSV/loadTourismCSV.js";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";

// Pure analytics helpers — synchronous, side-effect free
import centralTendency from "./utils/analysis/centralTendency.js";
import seasonalityMonthly from "./utils/analysis/seasonalityMonthly.js";
import dominanceRatio from "./utils/analysis/dominanceRatio.js";
import KPIs from "./utils/analysis/KPIs.js";
import { PCC_12, PCC_15, SCC_12, SCC_15 } from "./utils/analysis/correlation.js";
import computeNumericColumnStats from "./utils/analysis/statsForVariablesFromCSV/variablesStats.js";
import { EXCEL_12_COLS } from "./utils/dataFromCSV/loadTourismCSV.js";
import { runLinearRegressionFromRows, runGLMFromRows } from "./utils/statsServiceClient/statsServiceClient.js";

// 1) Load environment variables ASAP so all code that reads process.env sees them
dotenv.config();

// 2) Create and configure the HTTP app
const app = express();
app.use(cors()); // Allow the frontend (different origin) to call this API

// ───────────────────────────── Configuration ─────────────────────────────

// HTTP port. Defaults to 8080 for local development
const PORT = process.env.PORT || 8080;

// Cache time-to-live (seconds). Default: 30 minutes (1800s)
const CACHE_IN_SECONDS = Number(process.env.CACHE_IN_SECONDS || 1800);

// ───────────────────────────── In-memory cache ───────────────────────────

/**
 * `cache` stores the *entire* Redash response envelope as returned by
 * fetchTourismData()
 */
let cache = null;     // Redash envelope or null when unknown/failed
let cacheTime = 0;    // `Date.now()` when cache was last updated
let ready = false;    // True after the initial warm-up fetch succeeds
let initError = null; // Error captured during warm-up (if any)

// ───────────────────────────── Routes ────────────────────────────────────

/**
 * GET /tourism
 *
 * Returns the Redash envelope either from cache (when fresh) or after
 * performing a refresh fetch. The returned JSON is augmented with a
 * `source` field: "cache" or "redash" to make behavior transparent.
 *
 * Failure modes:
 *  - If the initial warm-up never succeeded, respond 503 to signal that
 *   tourism data is currently unavailable (frontend can retry/backoff).
 *  - On runtime fetch errors, respond 500 with a short error and details.
 */
app.get("/tourism", async (req, res) => {
  // If the warm-up failed (or hasn't happened), surface a clear 503
  if (!ready) {
    return res.status(503).json({
      error: "Initialization failed: BI data unavailable!",
      details: initError ? initError.message : "Unknown error!",
    });
  }

  try {
    const now = Date.now();

    // Determine freshness: if present and younger than TTL, serve the cache
    const fresh = cache && now - cacheTime < CACHE_IN_SECONDS * 1000;

    if (fresh) {
      return res.json({ source: "cache", ...cache });
    }

    // Cache is missing or stale → fetch a fresh copy from Redash
    const json = await fetchTourismData();

    // Atomically replace the cache and its timestamp
    cache = json;
    cacheTime = now;

    return res.json({ source: "redash", ...cache });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data!", details: err.message });
  }
});

// ───────────────────────────── Normalized rows endpoint ──────────────────

/**
 * GET /tourism/normalizedData
 *
 * Returns the normalized rows (shape defined by normalizeTourismData).
 * Useful for sanity-checking data transformation and for feeding charts
 * that expect a consistent schema across sources.
 */
app.get("/tourism/normalizedData", (req, res) => {
  try {
    if (!ready) {
      return res.status(503).json({ error: "Data not ready yet!" });
    }

    // Defensive access: different Redash versions might tweak envelope keys
    const rows = cache?.query_result?.data?.rows;
    if (!Array.isArray(rows)) {
      return res.status(500).json({ error: "Invalid envelope: rows is not an array!" });
    }

    const normalized = normalizeTourismData(rows);

    // Minimal shape check to catch accidental regressions in normalization
    if (!normalized.length || !("month" in normalized[0]) || !("total_stays" in normalized[0])) {
      return res.status(500).json({ error: "Normalization failed: unexpected shape!" });
    }

    return res.json({ ok: true, count: normalized.length, sample: normalized });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to normalize data!", details: err.message });
  }
});

// ───────────────────────────── Analysis endpoints ────────────────────────

/**
 * 1) Central tendency per area
 *
 * Computes statistics such as mean/median across areas/months, depending on
 * your centralTendency() implementation
 */
app.get("/tourism/central-tendency", async (req, res) => {
  try {
    if (!ready) {
      return res.status(500).json({
        error: "Data not found!",
        details: initError ? initError.message : "Unknown error!",
      });
    }

    const rows = cache?.query_result?.data?.rows;
    if (!Array.isArray(rows)) {
      return res.status(500).json({ error: "Invalid envelope: rows is not an array!" });
    }

    const norm = await normalizeTourismData(rows);

    if (!norm.length || !("month" in norm[0]) || !("total_stays" in norm[0])) {
      return res.status(500).json({ error: "Normalization failed: unexpected shape!" });
    }

    return res.json(centralTendency(norm));
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Failed to provide central-tendency analysis!", details: err.message });
  }
});

/**
 * 2) Seasonality trends by month
 * - For each month number (01..12), compute average Italians, Foreigners, Total
 *  This reveals *typical* month pattern (seasonality).
 */
app.get("/tourism/seasonality-monthly-trends", async (req, res) => {
  try {
    if (!ready) {
      return res.status(503).json({
        error: "Data not found!",
        details: initError ? initError.message : "Unknown error!",
      });
    }

    const rows = cache?.query_result?.data?.rows;
    if (!Array.isArray(rows)) {
      return res.status(500).json({ error: "Invalid envelope: rows is not an array!" });
    }

    const norm = await normalizeTourismData(rows);

    if (!norm.length || !("month" in norm[0]) || !("total_stays" in norm[0])) {
      return res.status(500).json({ error: "Normalization failed: unexpected shape!" });
    }

    return res.json(seasonalityMonthly(norm));
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Failed to provide seasonality trend by months analysis!", details: err.message });
  }
});

/**
 * 3) Dominance ratio by area
 * Italian vs Foreign dominance ratio per area
 * - Aggregate sums per area (over all months/years in dataset)
 * - ratio = italians / foreigners
 * - also return shares (%) for context
 */
app.get("/tourism/dominance-ratio", async (req, res) => {
  try {
    if (!ready) {
      return res.status(503).json({
        error: "Data not found!",
        details: initError ? initError.message : "Unknown error!",
      });
    }

    const rows = cache?.query_result?.data?.rows;
    if (!Array.isArray(rows)) {
      return res.status(500).json({ error: "Invalid envelope: rows is not an array!" });
    }

    const norm = await normalizeTourismData(rows);

    if (!norm.length || !("month" in norm[0]) || !("total_stays" in norm[0])) {
      return res.status(500).json({ error: "Normalization failed: unexpected shape!" });
    }

    return res.json(dominanceRatio(norm));
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Failed to provide dominance ratio by area analysis!", details: err.message });
  }
});

/**
 * 4) KPIs
 * Computes a bundle of key performance indicators derived from normalized rows
 * - First aggregate "Tuscany total" per month (sum across areas)
 * - Then compute:
 *   TTS (Total Tourist Stays over dataset),
 *   AMS (Average Monthly Stays),
 *   Max Monthly Stays, Min Monthly Stays
 */
app.get("/tourism/kpi", async (req, res) => {
  try {
    if (!ready) {
      return res.status(503).json({
        error: "Data not found!",
        details: initError ? initError.message : "Unknown error!",
      });
    }

    const rows = cache?.query_result?.data?.rows;
    if (!Array.isArray(rows)) {
      return res.status(500).json({ error: "Invalid envelope: rows is not an array!" });
    }

    const norm = await normalizeTourismData(rows);

    if (!norm.length || !("month" in norm[0]) || !("total_stays" in norm[0])) {
      return res.status(500).json({ error: "Normalization failed: unexpected shape!" });
    }

    return res.json(KPIs(norm));
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Failed to provide KPI analysis!", details: err.message });
  }
});

// ───────────────────────────── CSV data correlation ────────────────────────
let csvRows = [];
app.get("/tourism/csv", async (req, res) => {
  // If the warm-up failed (or hasn't happened), surface a clear 503
  if (!ready) {
    return res.status(503).json({
      error: "Initialization failed: CSV data unavailable!",
      details: initError ? initError.message : "Unknown error!",
    });
  }

  try {
    csvRows = await loadTourismCSV();

    console.log(`📘 CSV loaded: ${csvRows.length} rows`);

    return res.json(csvRows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to fetch CSV data!",
      details: err.message,
    });
  }
});

//Pearson Correlation (12 rows)
app.get("/tourism/pcc12", async(req, res) => {
  // If the warm-up failed (or hasn't happened), surface a clear 503
  if (!ready) {
    return res.status(503).json({
      error: "Initialization failed: CSV data unavailable!",
      details: initError ? initError.message : "Unknown error!",
    });
  }

  try {
    const results_pcc_12 = PCC_12(await loadTourismCSV());
    return res.json(results_pcc_12);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to fetch CSV data!",
      details: err.message,
    });
  }
})

//Pearson Correlation (15 rows)
app.get("/tourism/pcc15", async(req, res) => {
  // If the warm-up failed (or hasn't happened), surface a clear 503
  if (!ready) {
    return res.status(503).json({
      error: "Initialization failed: CSV data unavailable!",
      details: initError ? initError.message : "Unknown error!",
    });
  }

  try {
    const results_pcc_15 = PCC_15(await loadTourismCSV());
    return res.json(results_pcc_15);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to fetch CSV data!",
      details: err.message,
    });
  }
})

// Spearman Correlation (12 rows)
app.get("/tourism/scc12", async(req, res) => {
  // If the warm-up failed (or hasn't happened), surface a clear 503
  if (!ready) {
    return res.status(503).json({
      error: "Initialization failed: CSV data unavailable!",
      details: initError ? initError.message : "Unknown error!",
    });
  }

  try {
    const results_scc_12 = SCC_12(await loadTourismCSV());
    return res.json(results_scc_12);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to fetch CSV data!",
      details: err.message,
    });
  }
})

// Spearman Correlation (15 rows)
app.get("/tourism/scc15", async(req, res) => {
  // If the warm-up failed (or hasn't happened), surface a clear 503
  if (!ready) {
    return res.status(503).json({
      error: "Initialization failed: CSV data unavailable!",
      details: initError ? initError.message : "Unknown error!",
    });
  }

  try {
    const results_scc_15 = SCC_15(await loadTourismCSV());
    return res.json(results_scc_15);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to fetch CSV data!",
      details: err.message,
    });
  }
})

// Table with statistics for each variable
app.get("/tourism/variables", async( req, res) => {
  if (!ready) {
    return res.status(503).json({
      error: "Initialization failed: CSV data unavailable!",
      details: initError ? initError.message : "Unknown error!",
    });
  }

  try {
    const rows = await loadTourismCSV(); // your existing loader
    const summaries = computeNumericColumnStats(rows);
    res.json(summaries);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to compute statistics for each variable!",
      details: err.message,
    });
  }
})

// ──────────────────────────── Python analysis endpoints ────────────────────────────
// Needed variables
const Y_COLS = EXCEL_12_COLS.filter(
  (row) => row !== "avg_length_of_stay"
);

app.get("/tourism/linearRegression", async (req, res) => {
  if (!ready) {
    return res.status(503).json({ 
      error: "CSV data unavailable",
      details: initError ? initError.message : "Unknown error!",
    });
  }

  try {
    const rows = await loadTourismCSV();

    const X_COLS = [
      "n_establishments_hotels",
      "n_establishments_extrahotel",
      "n_rentals",
    ];

    const results = {};

    for (const yCol of Y_COLS) {
      const modelName = `Y_${yCol}_vs_n_establishments`;
      const linearRegressionData = await runLinearRegressionFromRows(rows, yCol, X_COLS, modelName);
      results[yCol] = linearRegressionData;
    }

    return res.json(results);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to run regressions",
      details: err.message,
    });
  }
});

//──────────────────────────── GLM endpoints ────────────────────────────

const GLM_FAMILY_BY_Y = {
  // Counts (arrivals/stays)
  arrivals_italians: "poisson",
  arrivals_foreigners: "poisson",
  arrivals_total: "poisson",
  stays_italians: "poisson",
  stays_foreigners: "poisson",
  stays_total: "poisson",

  // Continuous / percentage variables
  coverage: "gaussian",
  pct_arrivals_italians: "gaussian",
  pct_arrivals_foreigners: "gaussian",
  pct_stays_italians: "gaussian",
  pct_stays_foreigners: "gaussian",
};

app.get("/tourism/glm", async (req, res) => {
  if (!ready) {
    return res.status(503).json({
      error: "Initialization failed: CSV data unavailable!",
      details: initError ? initError.message : "Unknown error!",
    });
  }

  try {
    const rows = await loadTourismCSV();

    // All establishment predictors
    const X_COLS = [
      "n_establishments_hotels",
      "n_establishments_extrahotel",
      "n_rentals",
    ];

    const results = {};

    for (const [yCol, family] of Object.entries(GLM_FAMILY_BY_Y)) {
      if (!(yCol in rows[0])) {
        results[yCol] = {
          error: `Missing column in CSV: ${yCol}`,
        };
        continue;
      }

      const modelName = `Y_${family}_${yCol}_vs_n_establishments`;
      const generalizedLinearModel = await runGLMFromRows(rows, yCol, X_COLS, family, modelName);
      results[yCol] = generalizedLinearModel;
    }

    return res.json({
      ok: true,
      family_map: GLM_FAMILY_BY_Y,
      x_cols: X_COLS,
      results,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to run GLM regressions",
      details: err.message,
    });
  }
});

// ───────────────────────────── Startup: warm-up + TFJS ─────────────────────────────

/*
 * On process start:
 *  - Warm the Tourism cache (non-blocking for server start logic below).
 *  - Initialize the TFJS WASM backend (optional but ensures consistency if
 *    you later add ML in endpoints). We call tf.ready() to wait until the
 *    backend is fully usable before logging readiness.
 *
 * If the warm-up fetch fails, endpoints that require data will reply 503
 * until a subsequent successful refresh occurs in /tourism.
 */
fetchTourismData()
  .then((data) => {
    cache = data;          // Seed cache with the Redash envelope
    cacheTime = Date.now(); // Mark as fresh now
    ready = true;
    initError = null;
  })
  .catch((err) => {
    ready = false;
    initError = err;
    console.error("Failed to fetch data from API: ", err.message);
  })
  .finally(async () => {
    // Prepare TFJS WASM before serving traffic that might use it later
    await tf.setBackend("wasm");
    await tf.ready();
    console.log("🧠 TFJS WASM backend ready");

    // Start the HTTP server
    app.listen(PORT, () => {
      console.log(`✅ Backend running on http://localhost:${PORT}`);
    });
  });
