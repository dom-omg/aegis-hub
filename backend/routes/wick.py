"""
WICK SECURITY Router — AEGIS-HUB
Code analysis → Z3 formal verification → signed certificate
"""

from __future__ import annotations

import base64
import json
import time
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from modules.signing import sign_proof
from modules.z3_engine import analyze_code

router = APIRouter(prefix="/api/wick", tags=["WICK SECURITY"])


# ---------------------------------------------------------------------------
# Sample vulnerable C code for demo
# ---------------------------------------------------------------------------

DEMO_C_CODE = """\
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* CWE-190: Integer Overflow — size computed from user input */
void process_buffer(unsigned int user_len) {
    unsigned int total = user_len + 16;  /* wraps if user_len ~ UINT_MAX */
    char *buf = malloc(total);
    if (!buf) return;

    /* CWE-121: Stack-based Buffer Overflow */
    char stack_buf[64];
    char *input = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    strcpy(stack_buf, input);   /* no bounds check */

    /* CWE-476: NULL Pointer Dereference */
    char *ptr = NULL;
    int val = ptr->field;      /* NULL dereference */

    free(buf);

    /* CWE-416: Use-after-free */
    buf->len = 0;              /* accessing freed pointer */
}

int main(void) {
    process_buffer(4294967280u);
    return 0;
}
"""


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    code:     str = Field(..., description="Source code to analyze")
    language: str = Field("python", description="Language: python | c | cpp | rust")
    project:  str = Field("", description="Project name (optional)")


class AnalyzeResponse(BaseModel):
    verdict:            str
    cwe:                str | None
    proof:              str
    language:           str
    project:            str
    constraints_checked: int
    certificate_id:     str
    signature:          dict[str, str]
    timestamp:          str
    certificate_b64:    str


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

def _run_pipeline(code: str, language: str, project: str) -> dict[str, Any]:
    start_ms = time.time()

    # 1. Z3 code analysis
    z3_result = analyze_code(code, language)

    # 2. Build certificate payload
    certificate_id = f"WICK-{uuid.uuid4().hex[:12].upper()}"
    timestamp_iso = datetime.utcnow().isoformat() + "Z"

    cert_payload: dict[str, Any] = {
        "certificate_id":     certificate_id,
        "issued_at":          timestamp_iso,
        "project":            project or "unnamed",
        "language":           language,
        "verdict":            z3_result["verdict"],
        "cwe":                z3_result.get("cwe"),
        "violations":         z3_result.get("violations_detected", []),
        "constraints_checked": z3_result["constraints_checked"],
        "proof_summary":      z3_result["proof"][:300],
        "engine":             "WICK SECURITY v1.0.0 · Z3 4.13",
    }

    # 3. Sign
    signature = sign_proof(cert_payload)

    # 4. Encode full certificate as base64 JSON
    full_cert = {**cert_payload, "signature": signature}
    certificate_b64 = base64.b64encode(
        json.dumps(full_cert, indent=2).encode()
    ).decode()

    processing_ms = int((time.time() - start_ms) * 1000)

    return {
        "verdict":             z3_result["verdict"],
        "cwe":                 z3_result.get("cwe"),
        "proof":               z3_result["proof"],
        "language":            language,
        "project":             project or "unnamed",
        "constraints_checked": z3_result["constraints_checked"],
        "certificate_id":      certificate_id,
        "signature":           signature,
        "timestamp":           timestamp_iso,
        "certificate_b64":     certificate_b64,
        "processing_ms":       processing_ms,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_code_endpoint(req: AnalyzeRequest) -> dict[str, Any]:
    """
    Full pipeline: code analysis → Z3 constraints → signed certificate.
    """
    if not req.code.strip():
        raise HTTPException(status_code=422, detail="code must not be empty")

    try:
        return _run_pipeline(req.code, req.language.lower(), req.project)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/demo")
async def demo() -> dict[str, Any]:
    """
    Demo run with sample vulnerable C code (CWE-190 integer overflow + more).
    """
    try:
        return _run_pipeline(DEMO_C_CODE, "c", "demo-vulnerable-app")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
