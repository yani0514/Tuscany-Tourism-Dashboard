import numpy as np
import pandas as pd
from .utils import scale_base100_to_sum1200


def link_relatives(monthly_dataframe: pd.DataFrame) -> np.ndarray:
    """
    Link Relatives seasonality index (monthly, base=100, normalized to sum=1200).

    Expects monthly_dataframe to contain:
      - 'y'     : metric values (float/int)
      - 'month' : integers 1..12
      - sorted by time (year_month) BEFORE calling this function (your prepare_monthly() should do that)
    """
    dataframe = monthly_dataframe.copy()

    metric_values = dataframe["y"].astype(float).to_numpy()

    # Compute link relatives (percent), LR_t = (Y_t / Y_{t-1}) * 100
    # First element has no previous month -> NaN
    link_relative_percent = np.full(metric_values.shape, np.nan, dtype=float)

    previous_values = metric_values[:-1]
    current_values = metric_values[1:]

    # Avoid division by zero (or negative/invalid values if they exist)
    valid_division_mask = previous_values != 0

    computed_lr = np.full(current_values.shape, np.nan, dtype=float)
    computed_lr[valid_division_mask] = (current_values[valid_division_mask] / previous_values[valid_division_mask]) * 100.0

    link_relative_percent[1:] = computed_lr
    dataframe["link_relative_percent"] = link_relative_percent

    # Average link relatives per calendar month (Jan..Dec)
    # Note: month=1 (January) usually has NaN because it has no previous month in each year
    average_link_relative_by_month = (
        dataframe.groupby("month")["link_relative_percent"]
        .mean()
        .reindex(range(1, 13))
    )

    # Chain the seasonal index:
    # Start January at 100, then:
    # S_m = S_{m-1} * (avgLR_m / 100)
    chained_seasonal_index = np.zeros(12, dtype=float)
    chained_seasonal_index[0] = 100.0  # January

    for month_index in range(1, 12):  # 1..11 corresponds to Feb..Dec
        average_lr_percent = average_link_relative_by_month.iloc[month_index]  # Feb is index 1, etc.

        if np.isnan(average_lr_percent) or average_lr_percent == 0:
            chained_seasonal_index[month_index] = np.nan
        else:
            chained_seasonal_index[month_index] = chained_seasonal_index[month_index - 1] * (average_lr_percent / 100.0)

    return scale_base100_to_sum1200(chained_seasonal_index)
