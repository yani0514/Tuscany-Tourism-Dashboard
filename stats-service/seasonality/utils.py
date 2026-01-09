import numpy as np
import pandas as pd

MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

def prepare_monthly(input_monthly_dataframe: pd.DataFrame) -> pd.DataFrame:
    """
    Ensures:
      - 'date' column is datetime
      - rows are sorted in correct temporal order
      - 'month' column contains calendar month (1..12)
      - 'time_index' is a sequential month index (0..N-1)
    """
    prepared_dataframe = input_monthly_dataframe.copy()

    prepared_dataframe["date"] = pd.to_datetime(prepared_dataframe["date"])

    if "municipality" in prepared_dataframe.columns:
        prepared_dataframe = prepared_dataframe.sort_values(["municipality", "date"])
    else:
        prepared_dataframe = prepared_dataframe.sort_values("date")

    prepared_dataframe["month"] = prepared_dataframe["date"].dt.month

    first_year_in_series = prepared_dataframe["date"].dt.year.min()
    prepared_dataframe["time_index"] = (
        (prepared_dataframe["date"].dt.year - first_year_in_series) * 12
        + (prepared_dataframe["date"].dt.month - 1)
    )

    return prepared_dataframe



def scale_base100_to_sum1200(seasonal_index_base100_12: np.ndarray) -> np.ndarray:
    seasonal_index = np.asarray(seasonal_index_base100_12, dtype=float)
    total = float(np.nansum(seasonal_index))
    if (not np.isfinite(total)) or total == 0.0:
        return seasonal_index
    return seasonal_index * (1200.0 / total)


def safe_filename_component(text: str) -> str:
    return "".join(ch if ch.isalnum() else "_" for ch in str(text))


def centered_moving_average_even_window(series: pd.Series, window: int) -> pd.Series:
    if window % 2 != 0:
        raise ValueError("This helper is for even window sizes only.")
    moving_average = series.rolling(window=window, center=False).mean()
    centered_moving_average = (moving_average + moving_average.shift(-1)) / 2.0
    return centered_moving_average

def json_safe(value):
    if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
        return None
    return value

def json_safe_list(values):
    return [json_safe(float(v)) for v in values]