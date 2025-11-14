import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { normalizeTourismDataCSV } from "./normalizeTourismDataCSV.js";

export const EXCEL_12_COLS = [
  // Core columns expected to exist after normalization
  "arrivals_italians",
  "arrivals_foreigners",
  "arrivals_total",
  "stays_italians",
  "stays_foreigners",
  "stays_total",
  "coverage",
  "pct_arrivals_italians",
  "pct_arrivals_foreigners",
  "pct_stays_italians",
  "pct_stays_foreigners",
  "avg_length_of_stay",
];

export const EXCEL_15_COLS = [
  ...EXCEL_12_COLS,
  "n_establishments_hotels",
  "n_establishments_extrahotel",
  "n_rentals",
];

/**
 * Reads a delimited text file (CSV/TSV) once and returns an array of row objects
 * with ENGLISH, normalized headers and parsed values (numbers where possible).
 */
export async function loadTourismCSV() {
  // 1) Resolve and validate the input path
  const raw = process.env.CSV_PATH;

  if (!raw) {
    throw new Error("Missing CSV_PATH in env!");
  }

  // Remove accidental surrounding quotes in .env values
  const file = raw.replace(/^["']|["']$/g, "");
  const abs = path.resolve(process.cwd(), file);

  console.log("→ Loading CSV:", abs);

  if (!fs.existsSync(abs)) {
    throw new Error(`CSV not found at: ${abs}`);
  }

  // 2) Choose the delimiter; default to ';'
  const SEP = process.env.CSV_SEP || ";";

  return new Promise((resolve, reject) => {
    const rows = [];

    const parser = parse({
      delimiter: SEP,
      trim: true, // trim cells
      skip_empty_lines: true,
      columns: (
        header // normalize headers
      ) =>
        header.map((h) =>
          String(h)
            .replace(/\uFEFF/g, "")
            .trim()
        ),
      cast: (value) => {
        // parse values
        if (value === "") return null;
        const num = Number(String(value).replace(",", "."));
        return Number.isNaN(num) ? value : num;
      },
    });

    fs.createReadStream(abs)
      .pipe(parser)
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows.map(normalizeTourismDataCSV)))
      .on("error", reject);
  });
}