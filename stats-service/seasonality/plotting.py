import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from .utils import MONTH_LABELS

def plot_seasonal_index(si_base100_12: np.ndarray, title: str, outpath: str) -> None:
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    x = np.arange(1, 13)

    plt.figure()
    plt.plot(x, si_base100_12, marker="o")
    plt.xticks(x, MONTH_LABELS)
    plt.xlabel("Month")
    plt.ylabel("Seasonal index (base 100, sum=1200)")
    plt.title(title)
    plt.tight_layout()
    plt.savefig(outpath, dpi=170)
    plt.close()
