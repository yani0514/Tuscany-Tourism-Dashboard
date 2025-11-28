const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";

// Generic fetch helper with basic error handling + optional timeout
async function apiGet(path, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`GET ${path} failed (${res.status}): ${text || res.statusText}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Endpoint for normalized data
export function fetchNormalized() {
  // returns { ok, count, sample: [...] }
  return apiGet("/tourism/normalizedData");
}

//Endpoint for central tendency analysis
export function fetchCentralTendency() {
  // returns [{ area, mean, std, median }, ...]
  return apiGet("/tourism/central-tendency");
}

//Endpoint for seasonality by months analysis
export function fetchSeasonalityMonthly() {
  // returns [{ month_num, italian_avg, foreigners_avg, total_avg }, ...]
  return apiGet("/tourism/seasonality-monthly-trends");
}

//Endpoint for dominance ratio analysis
export function fetchDominanceRatio() {
  // returns [{ area, italians, foreigners, ratio, italianSharePercent, foreignSharePercent }, ...]
  return apiGet("/tourism/dominance-ratio");
}

//Endpoint for KPIs
export function fetchKPIs() {
  // returns { totalTouristStays, averageMonthlyStays, maxMonthlyStays, maxMonthlyLabel, minMonthlyStays, minMonthlyLabel }
  return apiGet("/tourism/kpi");
}

export function fetchPCC_12() {
  // returns {"columns" ["arrivals_italians","arrivals_foreigners","arrivals_total","stays_italians","stays_foreigners"....], "values" [1,0.811399418799413,0.891157207922602,0.850760060488909]...}
  return apiGet("/tourism/pcc12");
}

export function fetchPCC_15() {
  // returns {"columns" ["arrivals_italians","arrivals_foreigners","arrivals_total","stays_italians","stays_foreigners"....], "values" [1,0.811399418799413,0.891157207922602,0.850760060488909]...}
  return apiGet("/tourism/pcc15");
}

export function fetchSCC_12() {
  // returns {"columns" ["arrivals_italians","arrivals_foreigners","arrivals_total","stays_italians","stays_foreigners"....], "values" [1,0.811399418799413,0.891157207922602,0.850760060488909]...}
  return apiGet("/tourism/scc12");
}

export function fetchSCC_15() {
  // returns {"columns" ["arrivals_italians","arrivals_foreigners","arrivals_total","stays_italians","stays_foreigners"....], "values" [1,0.811399418799413,0.891157207922602,0.850760060488909]...}
  return apiGet("/tourism/scc15");
}

export function fetchVariableStats () {
  // return [{"name": "arrivals_italians", "type": "numeric", "min": 0, "max": 108834,"std": "6269.88","avg": "2134.70","median": 486}]
  return apiGet("/tourism/variables");
}