from fastapi import FastAPI, Body
from analysis.linearRegression import *
from analysis.generalizedLinearModel import *
from seasonality.all_seasonality_indices import compute_seasonality_run
from fastapi.staticfiles import StaticFiles

import os
import pandas as pd

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/linear-regression")
def linear_regression_endpoint(payload: dict = Body(...)):
    return run_linear_regression(
        payload["y"], 
        payload["X"], 
        payload.get("model_name"),
    )

@app.post("/generalized-linear-model")
def glm_endpoint(payload: dict = Body(...)):
    return run_glm(
        payload["y"],
        payload["X"],
        payload["family"],      # "poisson" or "gaussian"
        payload.get("model_name"),
    )


@app.post("/seasonality")
def seasonality_endpoint(payload: dict = Body(...)):
    """
    payload example:
    {
      "metric_col": "arrivals_total",
      "rows": [ { "municipality": "...", "year_month": "2024-01", ... }, ... ],
      "out_root": "exports/seasonality"  (optional)
    }
    """
    metric_col = payload["metric_col"]
    rows = payload["rows"]
    out_root = payload.get("out_root", "exports/seasonality")

    raw_df = pd.DataFrame(rows)

    out = compute_seasonality_run(
        raw_df=raw_df,
        metric_col=metric_col,
        out_root=out_root,
        municipality_col="municipality",
        year_month_col="year_month",
        trend_hat_col=payload.get("trend_hat_col"),  # optional
    )
    return out


os.makedirs("exports", exist_ok=True)
app.mount("/exports", StaticFiles(directory="exports"), name="exports")