"""
RFC 3161 Timestamp Module — AEGIS-HUB
Uses freetsa.org TSA; falls back to local timestamp if unavailable.
"""

from __future__ import annotations

import base64
import datetime
import hashlib

import httpx


def build_tsq(digest: bytes) -> bytes:
    """
    Build a minimal RFC 3161 TimeStampReq using raw ASN.1 encoding.

    Structure:
        TimeStampReq ::= SEQUENCE {
            version         INTEGER { v1(1) },
            messageImprint  MessageImprint,
            nonce           INTEGER OPTIONAL,
            certReq         BOOLEAN DEFAULT FALSE
        }
        MessageImprint ::= SEQUENCE {
            hashAlgorithm   AlgorithmIdentifier,
            hashedMessage   OCTET STRING
        }
    """
    # AlgorithmIdentifier for SHA-256 (OID 2.16.840.1.101.3.4.2.1)
    sha256_oid = bytes([
        0x06, 0x09,
        0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01,
    ])
    null = bytes([0x05, 0x00])
    alg_id = bytes([0x30, len(sha256_oid) + len(null)]) + sha256_oid + null

    # MessageImprint inner = AlgorithmIdentifier + OCTET STRING (digest)
    octet_string = bytes([0x04, len(digest)]) + digest
    msg_imprint_inner = alg_id + octet_string
    msg_imprint = bytes([0x30, len(msg_imprint_inner)]) + msg_imprint_inner

    # Nonce — use first 8 bytes of digest as a stable nonce
    nonce_val = int.from_bytes(digest[:8], "big")
    nonce_bytes = nonce_val.to_bytes(8, "big")
    # Strip leading zeros for DER INTEGER (must not have redundant leading 0x00
    # unless high bit set)
    stripped = nonce_bytes.lstrip(b"\x00") or b"\x00"
    if stripped[0] & 0x80:
        stripped = b"\x00" + stripped
    nonce = bytes([0x02, len(stripped)]) + stripped

    # version = 1
    version = bytes([0x02, 0x01, 0x01])
    # certReq = TRUE
    cert_req = bytes([0x01, 0x01, 0xFF])

    inner = version + msg_imprint + nonce + cert_req
    return bytes([0x30, len(inner)]) + inner


async def get_rfc3161_timestamp(data: bytes) -> dict:
    """
    Request an RFC 3161 timestamp from freetsa.org.
    Falls back to local timestamp on any failure.
    """
    digest = hashlib.sha256(data).digest()
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    try:
        tsq = build_tsq(digest)
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://freetsa.org/tsr",
                content=tsq,
                headers={"Content-Type": "application/timestamp-query"},
            )
        resp.raise_for_status()
        token_b64 = base64.b64encode(resp.content).decode()
        return {
            "timestamp": now_iso,
            "tsa": "freetsa.org",
            "rfc3161": True,
            "token_b64": token_b64,
            "digest_sha256": digest.hex(),
        }
    except Exception:
        return {
            "timestamp": now_iso,
            "tsa": "local-fallback",
            "rfc3161": False,
            "note": "TSA unavailable — local timestamp only",
            "digest_sha256": digest.hex(),
        }
