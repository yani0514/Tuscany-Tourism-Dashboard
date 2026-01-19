import numpy as np
import pandas as pd
from .utils import centered_moving_average_even_window, scale_base100_to_sum1200

def ratio_to_moving_average(monthly_prepared_dataframe: pd.DataFrame) -> np.ndarray:
    """
    Computes seasonal indices using the Ratio-to-Moving-Average method.

    Assumptions about input:
      - Has a 'y' column (the monthly observed value)
      - Has a 'month' column (1..12)
      - Has either:
          * 'date' (preferred), or
          * 'time_index' (preferred if you already computed it), or
          * ('year' and 'month') as a last fallback
      - Rows must be in correct chronological order for moving averages to make sense
    """
    prepared_dataframe = monthly_prepared_dataframe.copy()

    # --- Sort safely in true chronological order ---
    if "date" in prepared_dataframe.columns:
        prepared_dataframe["date"] = pd.to_datetime(prepared_dataframe["date"])
        prepared_dataframe = prepared_dataframe.sort_values("date").reset_index(drop=True)
    elif "time_index" in prepared_dataframe.columns:
        prepared_dataframe = prepared_dataframe.sort_values("time_index").reset_index(drop=True)
    elif "year" in prepared_dataframe.columns and "month" in prepared_dataframe.columns:
        prepared_dataframe = prepared_dataframe.sort_values(["year", "month"]).reset_index(drop=True)
    else:
        raise ValueError(
            "ratio_to_moving_average requires 'date' or 'time_index' or ('year' and 'month') "
            "to sort the series chronologically."
        )

    # --- Extract the observed monthly series ---
    observed_monthly_values = prepared_dataframe["y"].astype(float)

    # --- Compute 12-month centered moving average (trend estimate) ---
    centered_moving_average_12 = centered_moving_average_even_window(
        observed_monthly_values,
        window=12
    )

    # --- Ratio = observed / trend ---
    ratio_observed_to_trend = (observed_monthly_values / centered_moving_average_12).replace(
        [np.inf, -np.inf],
        np.nan
    )

    # --- Keep only timestamps where the CMA exists ---
    valid_ratio_values = ratio_observed_to_trend.dropna()

    # --- Group valid ratios by calendar month and average ---
    calendar_month_for_valid_rows = prepared_dataframe.loc[valid_ratio_values.index, "month"]
    mean_ratio_by_calendar_month = (
        valid_ratio_values
        .groupby(calendar_month_for_valid_rows)
        .mean()
        .reindex(range(1, 13))
    )

    # --- Convert to base-100 seasonal indices and scale to sum=1200 ---
    seasonal_indices_base100 = 100.0 * mean_ratio_by_calendar_month.to_numpy(dtype=float)
    seasonal_indices_sum1200 = scale_base100_to_sum1200(seasonal_indices_base100)

    return seasonal_indices_sum1200
