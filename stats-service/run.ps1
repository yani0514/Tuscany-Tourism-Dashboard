# run.ps1 (inside stats-service)

$ErrorActionPreference = "Stop"

# 1) Go to the folder where this script lives (stats-service)
Set-Location $PSScriptRoot

# 2) Activate the venv from this folder
$venvActivate = Join-Path $PSScriptRoot "venv\Scripts\Activate.ps1"

if (Test-Path $venvActivate) {
    . $venvActivate
} else {
    Write-Host "⚠ Virtual environment not found at $venvActivate"
    Write-Host "  Running with global Python instead."
}

# 3) Start the FastAPI app with uvicorn
uvicorn main:app --reload --port 8001
