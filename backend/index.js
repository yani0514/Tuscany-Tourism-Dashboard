import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetchBIData from "./utils/fetchBIData.js";
dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;
const CACHE_IN_SECONDS = process.env.CACHE_IN_SECONDS || 1800;

let cache = null;
let cacheTime = 0;

//---- Route: Get Tourism data
app.get("/api/tourism", async (req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_IN_SECONDS * 1000) {
      return res.json({ source: "cache", ...cache });
    }

    //Stores the result and timestamp so you can reuse it for the next requests
    const rows = json.query_results.data.rows;
    cache = { lastUpdated: new Date().toISOString(), count: rows.length, rows };
    cacheTime = now;

    //Return the data to the backend
    res.json({ source: "redash", ...cache });
    res.status(200).json({ message: "Data fetched successfully!" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to fetch data!", details: err.message });
  }
});

fetchBIData()
  .then((data) => {
    cache = data;

    app.listen(PORT, () => {
      console.log(`✅ Backend running on http://localhost:${PORT}`);
      console.log("Data is: \n", cache);
    });
  })
  .catch((err) => {
    console.error(err);
  });
