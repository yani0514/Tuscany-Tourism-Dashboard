// Maps Excel (Italian) headers → English equivalent
// Any column that is not present in this map is preserved with its original name
export function normalizeTourismDataCSV(row) {
  const map = {
    // Filters / identifying fields
    "comune::filter": "municipality",
    "Anno-Mese::filter": "year_month",

    // Arrivals
    arrivi_italiani: "arrivals_italians",
    arrivi_stranieri: "arrivals_foreigners",
    arrivi_totale: "arrivals_total",

    // Stays (presenze)
    presenze_italiane: "stays_italians",
    presenze_stranieri: "stays_foreigners",
    presenze_totale: "stays_total",

    // Coverage / percentages
    copertura: "coverage",
    perc_arr_ita: "pct_arrivals_italians",
    perc_arr_stra: "pct_arrivals_foreigners",

    perc_pre_ita: "pct_stays_italians",
    perc_pre_stra: "pct_stays_foreigners",
    permanenza_media: "avg_length_of_stay",

    // Establishments
    n_es_alberghieri: "n_establishments_hotels",
    n_es_extralberghieri: "n_establishments_extrahotel",
    n_locazioni: "n_rentals",
    n_es_totali: "n_establishments_total",

    // Display name
    denominazione: "municipality_name",
  };

  // Build a new object with renamed keyeys, preserving unkeynown columns
  const normalized = {};
  for (const key of Object.keys(row)) {
    const newkey = map[key] || key; // pass-through for unexpected columns
    normalized[newkey] = row[key];
  }
  return normalized;
}
