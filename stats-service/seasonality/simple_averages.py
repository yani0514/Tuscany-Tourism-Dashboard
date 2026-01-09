import numpy as np
import pandas as pd
from .utils import scale_base100_to_sum1200

def simple_averages(df: pd.DataFrame) -> np.ndarray:
    overall_mean = df["y"].mean()
    month_means = df.groupby("month")["y"].mean().reindex(range(1, 13))

    si = (month_means / overall_mean).to_numpy(dtype=float)
    si_base100 = 100.0 * si
    return scale_base100_to_sum1200(si_base100)
