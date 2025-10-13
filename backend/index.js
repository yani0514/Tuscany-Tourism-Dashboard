/**
 * Tuscany Tourism Dashboard — Backend
 *
 * Exposes a single `/tourism` endpoint that serves BI data from Redash.
 * Uses an in-memory cache to avoid hammering the Redash API.
 *
 * Caching strategy:
 *   - On boot: warm the cache (fetch once), then start the server.
 *   - On request: if cache is “fresh” (age < CACHE_IN_SECONDS), serve it.
 *                 otherwise refresh the cache and return the new data.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetchBIData from "./utils/fetchTourismData.js"; // async function that returns the full Redash JSON envelope

// Load environment variables from .env into process.env
dotenv.config();

const app = express();
app.use(cors()); // Allow cross-origin requests (frontend -> backend)

// ---- Configuration ---------------------------------------------------------

// HTTP port to listen on. Defaults to 8080 if not supplied.
const PORT = process.env.PORT || 8080;

// Cache TTL (in seconds). Default: 30 minutes (1800s).
const CACHE_IN_SECONDS = process.env.CACHE_IN_SECONDS || 1800;

// ---- In-memory cache -------------------------------------------------------


let cache = null;          // Will hold the *entire* Redash response envelope (includes query_result, etc.).
let cacheTime = 0;         // Timestamp (in seconds) when `cache` was last refreshed.
let ready = false;         // indicates whether initial data load succeeded
let initError = null;      // stores the warm-up error if any

// ---- Routes ----------------------------------------------------------------

/**
 * GET /tourism
 * Returns the tourism BI dataset. Responds with either:
 *   { source: "cache", ...cachedEnvelope }   — when cache is fresh, or
 *   { source: "redash", ...freshEnvelope }   — after a refresh fetch
 *
 * Error handling:
 *   - On any failure, replies with 500 and a short message + details.
 */
app.get("/tourism", async (req, res) => {
  if (!ready) {
    // Data failed to fetch during server start
    return res.status(503).json({
      erro: "Initialization failed: BI data unavailable.",
      details: initError ? initError.message : "Unknown error!"
    });
  }

  try {
    const now = Date.now();

    // Determine if the cached data is still fresh (age < TTL).
    const fresh = cache && now - cacheTime < Number(CACHE_IN_SECONDS) * 1000;

    if (fresh) {
      // Serve from memory to minimize latency and reduce upstream load.
      return res.json({ source: "cache", ...cache });
    }

    // Cache is missing or old — fetch a fresh copy from Redash.
    const json = await fetchBIData();

    // Update cache and freshness timestamp.
    cache = json;
    cacheTime = now;

    // Return the freshly fetched data.
    return res.json({ source: "redash", ...cache });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to fetch data!", details: err.message });
  }
});

/*
 * Fetch the data on startup so the first client request is fast
 * and any configuration/API issues are early detected
 */
fetchBIData()
  .then((data) => {
    cache = data; // Seed the cache with the Redash envelope
    cacheTime = Date.now(); // Mark it as fresh *now*
    ready = true;
    initError = null;
  })
  .catch((err) => {
    ready = false;
    initError = err;
    console.error("Failed to fetch data from API: ", err.message);
  })
  .finally(() => {
    //Start the server
    app.listen(PORT, () => {
      console.log(`✅ Backend running on http://localhost:${PORT}`);
    });
  });