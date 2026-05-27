"""
AEGIS-HUB FastAPI Backend
Serves: EVIDENTUM (blockchain forensics) + WICK SECURITY (code verification)
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.evidentum import router as evidentum_router
from routes.wick import router as wick_router

# Load env vars early (dotenv)
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="AEGIS-HUB",
    description=(
        "Proof Intelligence Backend — "
        "EVIDENTUM (blockchain forensics) + WICK SECURITY (code verification)"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow all origins for development / cross-platform frontends
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(evidentum_router)
app.include_router(wick_router)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "aegis-hub"}
