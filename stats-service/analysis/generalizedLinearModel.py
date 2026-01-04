import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.tools.sm_exceptions import PerfectSeparationError


def get_family(family_name: str):
    """
    Family selector using statsmodels canonical links:
      - Gaussian  -> identity link
      - Poisson   -> log link
      - Binomial  -> logit link
    """
    name = family_name.lower()
    if name == "gaussian":
        return sm.families.Gaussian()
    if name == "poisson":
        return sm.families.Poisson()
    if name == "binomial":
        return sm.families.Binomial()
    raise ValueError(f"Unsupported family: {family_name}")


def _safe_float(x):
    try:
        if x is None:
            return None
        xf = float(x)
        if np.isnan(xf) or np.isinf(xf):
            return None
        return xf
    except Exception:
        return None


def _safe_round(x, nd=4):
    xf = _safe_float(x)
    if xf is None:
        return None
    return float(round(xf, nd))


def _fit_null_glm(y, family):
    """
    Fit an intercept-only GLM for comparisons (null model).
    """
    n = len(y)
    X_null = sm.add_constant(np.zeros((n, 1)), has_constant="add")
    return sm.GLM(y, X_null, family=family).fit()


# ───────────────────────────── GLM equivalents of OLS-style measures ─────────────────────────────

def _pseudo_r2_deviance(result, null_result):
    """
    Deviance-based pseudo R² ("explained deviance"):
      R²_dev = 1 - (D_model / D_null)
    """ 
    d_model = _safe_float(getattr(result, "deviance", None))
    d_null = _safe_float(getattr(null_result, "deviance", None)) if null_result is not None else None
    if d_model is None or d_null is None or d_null <= 0:
        return None
    return 1.0 - (d_model / d_null)


def _pseudo_r2_mcfadden_adjusted(result, null_result, k):
    """
    Adjusted McFadden pseudo R² (penalizes complexity):
      R²_adj = 1 - ((llf - k) / llnull)
    where k = number of predictors excluding intercept.
    """
    llf = _safe_float(getattr(result, "llf", None))
    llnull = _safe_float(getattr(null_result, "llf", None)) if null_result is not None else None
    if llf is None or llnull is None or llnull == 0:
        return None
    return 1.0 - ((llf - float(k)) / llnull)


def _lr_test_p_value(result, null_result):
    """
    Likelihood Ratio (LR) test vs null model:
      LR = 2*(ll_full - ll_null) ~ Chi^2(df=k)
    This is the GLM analogue of the "overall F-test" in OLS.
    """
    llf = _safe_float(getattr(result, "llf", None))
    llnull = _safe_float(getattr(null_result, "llf", None)) if null_result is not None else None
    df = int(getattr(result, "df_model", 0))  # excludes intercept

    if llf is None or llnull is None or df <= 0:
        return None

    LR = 2.0 * (llf - llnull)
    if np.isnan(LR) or np.isinf(LR) or LR < 0:
        return None

    try:
        from scipy.stats import chi2
        return float(chi2.sf(LR, df))
    except Exception:
        return None


def _predictive_pseudo_r2_holdout(y, X, family, test_size=0.2, seed=42):
    """
    Simple predictive GLM analogue of predicted R² using a single holdout split:
      pred_R² = 1 - (D_test_full / D_test_null)

    Uses deviance on the held-out set (likelihood-based).
    """
    y = np.asarray(y, dtype=float)
    X = np.asarray(X, dtype=float)
    n = len(y)
    if n < 30:
        return None

    rng = np.random.default_rng(seed)
    idx = np.arange(n)
    rng.shuffle(idx)

    split = int(round(n * (1.0 - test_size)))
    train_idx = idx[:split]
    test_idx = idx[split:]
    if len(test_idx) < 5 or len(train_idx) < 10:
        return None

    y_tr, y_te = y[train_idx], y[test_idx]
    X_tr, X_te = X[train_idx], X[test_idx]

    # Fit full model on train
    res_tr = sm.GLM(y_tr, X_tr, family=family).fit()

    # Fit null model on train
    null_tr = _fit_null_glm(y_tr, family)

    # Predict on test
    mu_full = np.asarray(res_tr.predict(X_te), dtype=float)
    mu_null = np.asarray(null_tr.predict(sm.add_constant(np.zeros((len(y_te), 1)), has_constant="add")), dtype=float)

    # Convert to "test deviance" via deviance residuals
    d_full = float(np.sum(family.resid_dev(y_te, mu_full) ** 2))
    d_null = float(np.sum(family.resid_dev(y_te, mu_null) ** 2))

    if d_null <= 0 or np.isnan(d_full) or np.isnan(d_null) or np.isinf(d_full) or np.isinf(d_null):
        return None

    return 1.0 - (d_full / d_null)


def run_glm(y_list, X_dict, family: str, model_name: str | None = None):
    """
    GLM-only evaluation:

    Returned keys match your API shape, BUT they represent GLM equivalents:
      - r2        : deviance pseudo R² (explained deviance)
      - adj_r2    : adjusted McFadden pseudo R²
      - pred_r2   : predictive pseudo R² (holdout deviance improvement)
      - f_test_p_value : LR test p-value vs null (overall significance)

    Also returns AIC/BIC and coefficients+p-values (native GLM outputs).
    """
    # 1) DataFrame
    df = pd.DataFrame(X_dict)
    df["__y__"] = y_list

    # 2) Drop NaN / inf
    df = df.replace([np.inf, -np.inf], np.nan).dropna()

    y = df["__y__"].values
    X = df.drop(columns=["__y__"])

    # 3) Add intercept
    X = sm.add_constant(X, has_constant="add")

    n = int(len(y))
    p = int(X.shape[1])     # incl intercept
    k = int(max(p - 1, 0))  # predictors excl intercept

    # 4) Family
    fam = get_family(family)

    # 5) Fit
    try:
        result = sm.GLM(y, X, family=fam).fit()
    except PerfectSeparationError:
        raise ValueError("Perfect separation detected, GLM could not be fit.")

    # 6) Null model (intercept-only)
    null_res = None
    try:
        null_res = _fit_null_glm(y, fam)
    except Exception:
        null_res = None

    # 7) GLM equivalents
    r2_val = _pseudo_r2_deviance(result, null_res)
    adj_r2_val = _pseudo_r2_mcfadden_adjusted(result, null_res, k)
    pred_r2_val = _predictive_pseudo_r2_holdout(y, X.values, fam, test_size=0.2, seed=42)
    overall_p_val = _lr_test_p_value(result, null_res)

    # 8) AIC/BIC (valid for GLMs)
    aic = _safe_round(getattr(result, "aic", None), 4)

    bic = None
    llf = _safe_float(getattr(result, "llf", None))
    if llf is not None and n > 0:
        bic = _safe_round((-2.0 * llf + p * np.log(n)), 4)

    # 9) Coefficients + p-values
    coeffs = []
    for name, coef, p_value in zip(
        result.params.index, result.params.values, result.pvalues.values
    ):
        coeffs.append(
            {
                "name": str(name),
                "estimate": float(_safe_round(coef,3)),
                "p_value": float(_safe_round(p_value,3)),
            }
        )

    return {
        "model_name": model_name,
        "family": family,
        "n_observed_rows": n,

        # GLM equivalents, kept under the same keys for your existing API
        "r2": _safe_round(r2_val, 2),
        "adj_r2": _safe_round(adj_r2_val, 2),
        "pred_r2": _safe_round(pred_r2_val, 2),

        # AIC/BIC for GLM
        "aic": _safe_round(aic,2),
        "bic": _safe_round(bic,2),

        # GLM analogue of "overall model significance"
        "f_test_p_value": _safe_round(overall_p_val, 10),

        "coefficients": coeffs,
    }
