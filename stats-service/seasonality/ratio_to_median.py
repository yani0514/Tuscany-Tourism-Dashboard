import numpy as np
import pandas as pd
from .utils import scale_base100_to_sum1200

def ratio_to_median(monthly_dataframe: pd.DataFrame) -> np.ndarray:
    """
    E) Ratio-to-median seasonal index.
    Robust alternative to simple averages.
    Produces 12 monthly values.
    """
    dataframe = monthly_dataframe.copy()

    monthly_medians = (
        dataframe.groupby("month")["y"]
        .median()
        .reindex(range(1, 13))
        .astype(float)
        .to_numpy()
    )

    overall_median = float(np.nanmedian(monthly_medians))
    if (not np.isfinite(overall_median)) or overall_median == 0.0:
        seasonal_index_base100 = monthly_medians
    else:
        seasonal_index_base100 = (monthly_medians / overall_median) * 100.0

    return scale_base100_to_sum1200(seasonal_index_base100)
