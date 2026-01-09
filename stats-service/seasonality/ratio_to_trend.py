import numpy as np
import pandas as pd
from .utils import scale_base100_to_sum1200


def _fallback_trend_hat_log_linear(prepared_dataframe: pd.DataFrame) -> pd.Series:
    """
    Estimates the trend using a log-linear model:
        log(y_t) = a + b * time_index
    """

    observed_values = prepared_dataframe["y"].astype(float).clip(lower=1e-9)
    time_index = prepared_dataframe["time_index"].to_numpy(dtype=float)

    design_matrix = np.vstack([
        np.ones(len(prepared_dataframe)),
        time_index
    ]).T

    intercept, slope = np.linalg.lstsq(
        design_matrix,
        np.log(observed_values),
        rcond=None
    )[0]

    trend_estimate = np.exp(intercept + slope * time_index)
    return pd.Series(trend_estimate, index=prepared_dataframe.index)


def ratio_to_trend(monthly_prepared_dataframe: pd.DataFrame) -> np.ndarray:
    prepared_dataframe = monthly_prepared_dataframe.copy()

    if "trend_hat" not in prepared_dataframe.columns:
        prepared_dataframe["trend_hat"] = _fallback_trend_hat_log_linear(
            prepared_dataframe
        )
    else:
        prepared_dataframe["trend_hat"] = pd.to_numeric(
            prepared_dataframe["trend_hat"],
            errors="coerce"
        )

    ratio_observed_to_trend = (
        prepared_dataframe["y"] / prepared_dataframe["trend_hat"]
    ).replace([np.inf, -np.inf], np.nan)

    mean_ratio_by_calendar_month = (
        ratio_observed_to_trend
        .groupby(prepared_dataframe["month"])
        .mean()
        .reindex(range(1, 13))
    )

    seasonal_indices_base100 = 100.0 * mean_ratio_by_calendar_month.to_numpy(dtype=float)
    return scale_base100_to_sum1200(seasonal_indices_base100)
