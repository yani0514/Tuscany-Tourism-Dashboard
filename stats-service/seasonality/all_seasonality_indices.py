import os
from datetime import datetime
from typing import Dict, Any

import numpy as np
import pandas as pd

from .schema_adapter import to_canonical_monthly_df
from .utils import prepare_monthly, safe_filename_component, json_safe_list
from .plotting import plot_seasonal_index

from .simple_averages import simple_averages
from .ratio_to_trend import ratio_to_trend
from .ratio_to_moving_average import ratio_to_moving_average
from .link_relatives import link_relatives
from .ratio_to_median import ratio_to_median


def compute_seasonality_run(
    raw_df: pd.DataFrame,
    metric_col: str,
    out_root: str = "exports/seasonality",
    municipality_col: str = "municipality",
    year_month_col: str = "year_month",
    trend_hat_col: str | None = None,
) -> Dict[str, Any]:
    """
    Computes 5 seasonality indices (A-E) for:
      - OVERALL (all municipalities combined)
      - each municipality separately

    Produces:
      - a timestamped folder containing plots per municipality
      - a CSV file with the 5 indices per month
      - JSON-safe output (no NaN/Inf) for FastAPI responses
    """

    canonical_dataframe = to_canonical_monthly_df(
        raw_df=raw_df,
        metric_col=metric_col,
        municipality_col=municipality_col,
        year_month_col=year_month_col,
        trend_hat_col=trend_hat_col,
    )

    monthly_dataframe = prepare_monthly(canonical_dataframe)

    run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    run_dir = os.path.join(out_root, run_id)
    plots_dir = os.path.join(run_dir, "plots")
    os.makedirs(plots_dir, exist_ok=True)

    results: Dict[str, Any] = {}

    groups = [("OVERALL", monthly_dataframe)] + list(monthly_dataframe.groupby("municipality"))

    for municipality_name, municipality_rows in groups:
        municipality_rows = municipality_rows.copy()

        # Compute indices (numpy arrays, usually length 12)
        index_A = simple_averages(municipality_rows)
        index_B = ratio_to_trend(municipality_rows)
        index_C = ratio_to_moving_average(municipality_rows)
        index_D = link_relatives(municipality_rows)
        index_E = ratio_to_median(municipality_rows)

        # Prepare plot folder
        safe_municipality_name = safe_filename_component(municipality_name)
        municipality_plot_folder = os.path.join(plots_dir, safe_municipality_name)
        os.makedirs(municipality_plot_folder, exist_ok=True)

        # Save plots (raw arrays are OK for plotting)
        plot_seasonal_index(
            index_A,
            f"{municipality_name} - A_Simple_Averages ({metric_col})",
            os.path.join(municipality_plot_folder, "A_simple_averages.png"),
        )
        plot_seasonal_index(
            index_B,
            f"{municipality_name} - B_Ratio_To_Trend ({metric_col})",
            os.path.join(municipality_plot_folder, "B_ratio_to_trend.png"),
        )
        plot_seasonal_index(
            index_C,
            f"{municipality_name} - C_Ratio_To_Moving_Average ({metric_col})",
            os.path.join(municipality_plot_folder, "C_ratio_to_moving_average.png"),
        )
        plot_seasonal_index(
            index_D,
            f"{municipality_name} - D_Link_Relatives ({metric_col})",
            os.path.join(municipality_plot_folder, "D_link_relatives.png"),
        )
        plot_seasonal_index(
            index_E,
            f"{municipality_name} - E_Ratio_To_Median ({metric_col})",
            os.path.join(municipality_plot_folder, "E_ratio_to_median.png"),
        )

        # ✅ IMPORTANT: store JSON-safe lists (no NaN/Inf) for API response + CSV
        index_A_safe = json_safe_list(index_A)
        index_B_safe = json_safe_list(index_B)
        index_C_safe = json_safe_list(index_C)
        index_D_safe = json_safe_list(index_D)
        index_E_safe = json_safe_list(index_E)

        results[municipality_name] = {
            "A_simple_averages": index_A_safe,
            "B_ratio_to_trend": index_B_safe,
            "C_ratio_to_moving_average": index_C_safe,
            "D_link_relatives": index_D_safe,
            "E_ratio_to_median": index_E_safe,
            "plot_files": {
                "A_simple_averages": f"{run_id}/plots/{safe_municipality_name}/A_simple_averages.png",
                "B_ratio_to_trend": f"{run_id}/plots/{safe_municipality_name}/B_ratio_to_trend.png",
                "C_ratio_to_moving_average": f"{run_id}/plots/{safe_municipality_name}/C_ratio_to_moving_average.png",
                "D_link_relatives": f"{run_id}/plots/{safe_municipality_name}/D_link_relatives.png",
                "E_ratio_to_median": f"{run_id}/plots/{safe_municipality_name}/E_ratio_to_median.png",
            },
        }

    # Save numeric indices to CSV (CSV can store blanks; we use None -> NaN in pandas)
    csv_rows = []
    for municipality_name, municipality_result in results.items():
        for month_number in range(1, 13):
            csv_rows.append({
                "municipality": municipality_name,
                "month": month_number,
                "A_simple_averages": municipality_result["A_simple_averages"][month_number - 1],
                "B_ratio_to_trend": municipality_result["B_ratio_to_trend"][month_number - 1],
                "C_ratio_to_moving_average": municipality_result["C_ratio_to_moving_average"][month_number - 1],
                "D_link_relatives": municipality_result["D_link_relatives"][month_number - 1],
                "E_ratio_to_median": municipality_result["E_ratio_to_median"][month_number - 1],
            })

    os.makedirs(run_dir, exist_ok=True)
    pd.DataFrame(csv_rows).to_csv(os.path.join(run_dir, "seasonality_indices.csv"), index=False)

    return {
        "run_id": run_id,
        "run_dir": run_dir,
        "metric_col": metric_col,
        "results": results,
    }
