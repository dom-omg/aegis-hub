"""
EVIDENTUM Router — AEGIS-HUB
Blockchain forensics → Z3 proof → RFC 3161 timestamp → PDF affidavit
"""

from __future__ import annotations

import base64
import hashlib
import json
import time
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from modules.affidavit import generate_affidavit
from modules.blockchain import fetch_transactions
from modules.signing import sign_proof
from modules.timestamp import get_rfc3161_timestamp
from modules.z3_engine import analyze_blockchain

router = APIRouter(prefix="/api/evidentum", tags=["EVIDENTUM"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    wallet: str = Field(..., description="Wallet address to analyze")
    chain:  str = Field("ETH", description="Blockchain: ETH | BTC | TRX")
    case_ref: str = Field("", description="Case reference number (optional)")


class AnalyzeResponse(BaseModel):
    verdict:              str
    proof_type:           str
    wallet:               str
    chain:                str
    case_ref:             str
    transactions_analyzed: int
    constraints_checked:  int
    proof_hash:           str
    signature:            dict[str, str]
    timestamp_info:       dict[str, Any]
    affidavit_b64:        str
    processing_ms:        int


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

async def _run_pipeline(
    wallet: str,
    chain: str,
    case_ref: str,
) -> dict[str, Any]:
    start_ms = time.time()

    # 1. Fetch transactions
    transactions = await fetch_transactions(wallet, chain)

    # 2. Z3 formal analysis
    z3_result = analyze_blockchain(transactions)

    # 3. Build signable payload
    signable: dict[str, Any] = {
        "wallet":       wallet,
        "chain":        chain,
        "case_ref":     case_ref,
        "verdict":      z3_result["verdict"],
        "proof_type":   z3_result["proof_type"],
        "tx_count":     len(transactions),
        "constraints":  z3_result["constraints_checked"],
    }

    # 4. Sign
    signature = sign_proof(signable)

    # 5. RFC 3161 timestamp
    payload_bytes = json.dumps(signable, sort_keys=True).encode()
    timestamp_info = await get_rfc3161_timestamp(payload_bytes)

    # 6. Proof hash (SHA-256 of payload + signature)
    proof_hash_input = payload_bytes + signature["signature_hex"].encode()
    proof_hash = hashlib.sha256(proof_hash_input).hexdigest()

    # 7. Generate PDF affidavit
    pdf_bytes = generate_affidavit(
        wallet=wallet,
        chain=chain,
        case_ref=case_ref,
        z3_result=z3_result,
        signature=signature,
        timestamp_info=timestamp_info,
        transactions=transactions,
    )
    affidavit_b64 = base64.b64encode(pdf_bytes).decode()

    processing_ms = int((time.time() - start_ms) * 1000)

    return {
        "verdict":               z3_result["verdict"],
        "proof_type":            z3_result["proof_type"],
        "wallet":                wallet,
        "chain":                 chain,
        "case_ref":              case_ref or "EVIDENTUM-AUTO",
        "transactions_analyzed": len(transactions),
        "constraints_checked":   z3_result["constraints_checked"],
        "proof_hash":            proof_hash,
        "signature":             signature,
        "timestamp_info":        timestamp_info,
        "affidavit_b64":         affidavit_b64,
        "processing_ms":         processing_ms,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_wallet(req: AnalyzeRequest) -> dict[str, Any]:
    """
    Full pipeline: blockchain fetch → Z3 proof → sign → timestamp → PDF affidavit.
    """
    if not req.wallet.strip():
        raise HTTPException(status_code=422, detail="wallet must not be empty")

    try:
        return await _run_pipeline(req.wallet.strip(), req.chain.upper(), req.case_ref)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/demo")
async def demo() -> dict[str, Any]:
    """
    Demo run using the Ruja OneCoin wallet (1FeexV6bAHb8ybZjqQMjJrcCrHGW9sb6uF).
    Known BitConnect/OneCoin address — demonstrates EVIDENTUM detection pipeline.
    """
    try:
        return await _run_pipeline(
            wallet="1FeexV6bAHb8ybZjqQMjJrcCrHGW9sb6uF",
            chain="BTC",
            case_ref="DEMO-RUJA-ONECOINS-2024",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
