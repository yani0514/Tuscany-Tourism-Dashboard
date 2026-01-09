import pandas as pd

def to_canonical_monthly_df(
    raw_df: pd.DataFrame,
    metric_col: str,
    municipality_col: str = "municipality",
    year_month_col: str = "year_month",
    trend_hat_col: str | None = None,
) -> pd.DataFrame:
    
    df = raw_df.copy()

    if municipality_col not in df.columns:
        raise ValueError(f"Missing required column: {municipality_col}")
    if year_month_col not in df.columns:
        raise ValueError(f"Missing required column: {year_month_col}")
    if metric_col not in df.columns:
        raise ValueError(f"Missing required metric column: {metric_col}")

    # Parse "YYYY-MM" -> datetime of first day of that month.
    df["date"] = pd.to_datetime(df[year_month_col].astype(str) + "-01", format="%Y-%m-%d", errors="coerce")

    df["municipality"] = df[municipality_col].astype(str)
    df["y"] = pd.to_numeric(df[metric_col], errors="coerce")

    # Optionally include trend_hat (if you already computed it elsewhere)
    if trend_hat_col is not None:
        if trend_hat_col not in df.columns:
            raise ValueError(f"trend_hat_col='{trend_hat_col}' not found in dataframe.")
        df["trend_hat"] = pd.to_numeric(df[trend_hat_col], errors="coerce")

    # Keep only what we need + drop missing date/y
    keep_cols = ["date", "municipality", "y"] + (["trend_hat"] if "trend_hat" in df.columns else [])
    df = df[keep_cols].dropna(subset=["date", "y"])

    return df
