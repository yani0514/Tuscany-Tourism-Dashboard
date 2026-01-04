from fastapi import FastAPI, Body
from analysis.linearRegression import *
from analysis.generalizedLinearModel import *

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