import numpy as np
import pandas as pd
import statsmodels.api as sm

def compute_predicted_r2(result, y_array):
    """
    Compute predicted R² using PRESS:
      PRESS = sum(press_residuals^2)
      TSS   = sum( (y - y_mean)^2 )
      pred_R² = 1 - PRESS / TSS
    """
    try:
        influence = result.get_influence()
        press_resid = influence.resid_press
        press = float(np.sum(press_resid ** 2))

        tss = float(np.sum((y_array - np.mean(y_array)) ** 2))
        if tss <= 0:
            return None

        return 1.0 - press / tss
    except Exception:
        return None


def run_linear_regression(y_list, X_dict, model_name=None):
    """
    y_list: [y1, y2, ...]
    X_dict: { "col_name": [x1, x2, ...], ... }

    Returns a plain dict that can be serialized to JSON.
    """

    # Build DataFrame like you do in a notebook
    df = pd.DataFrame(X_dict)
    df["__y__"] = y_list

    # Drop rows with NaN / inf to avoid crashes
    df = df.replace([np.inf, -np.inf], np.nan).dropna()

    y = df["__y__"].values
    X = df.drop(columns=["__y__"])

    # Add intercept
    X = sm.add_constant(X, has_constant="add")

    # Fit OLS
    model = sm.OLS(y, X)
    result = model.fit()

    # Metrics
    r2 = float(round(result.rsquared,2))
    adj_r2 = float(round(result.rsquared_adj,2))
    aic = float(round(result.aic,2))
    bic = float(round(result.bic,2))
    f_test_p_value = (
        float(round(result.f_pvalue, 2)) if result.f_pvalue is not None else None
    )
    pred_r2_raw = compute_predicted_r2(result, y)
    pred_r2 = float(round(pred_r2_raw, 2)) if pred_r2_raw is not None else None

    # Coefficients
    coeffs = []
    for name, coef, p_value in zip(
        result.params.index, result.params.values, result.pvalues.values
    ):
        coeffs.append(
            {
                "name": str(name),
                "estimate": float(round(coef,3)),
                "p_value": float(round(p_value,3)),
            }
        )

    return {
        "model_name": model_name,
        "n_observed_rows": int(len(y)),
        "r2": r2,
        "adj_r2": adj_r2,
        "pred_r2": pred_r2,
        "aic": aic,
        "bic": bic,
        "f_test_p_value": f_test_p_value,
        "coefficients": coeffs,
    }
