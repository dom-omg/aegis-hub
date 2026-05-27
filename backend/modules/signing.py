"""
Ed25519 Signing Module — AEGIS-HUB
Generates a keypair on first run, persists to keys/ dir.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
)

KEYS_DIR = Path(__file__).parent.parent / "keys"
PRIVATE_KEY_PATH = KEYS_DIR / "aegis_private.pem"
PUBLIC_KEY_PATH = KEYS_DIR / "aegis_public.pem"

_private_key: Ed25519PrivateKey | None = None
_public_key: Ed25519PublicKey | None = None


def _ensure_keypair() -> tuple[Ed25519PrivateKey, Ed25519PublicKey]:
    """Load existing keypair or generate a new one and persist it."""
    global _private_key, _public_key

    if _private_key is not None and _public_key is not None:
        return _private_key, _public_key

    KEYS_DIR.mkdir(parents=True, exist_ok=True)

    if PRIVATE_KEY_PATH.exists() and PUBLIC_KEY_PATH.exists():
        # Load existing keys
        priv_pem = PRIVATE_KEY_PATH.read_bytes()
        from cryptography.hazmat.primitives.serialization import load_pem_private_key
        _private_key = load_pem_private_key(priv_pem, password=None)  # type: ignore[assignment]
        _public_key = _private_key.public_key()  # type: ignore[union-attr]
    else:
        # Generate fresh keypair
        _private_key = Ed25519PrivateKey.generate()
        _public_key = _private_key.public_key()

        PRIVATE_KEY_PATH.write_bytes(
            _private_key.private_bytes(
                Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()
            )
        )
        PUBLIC_KEY_PATH.write_bytes(
            _public_key.public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
        )

    return _private_key, _public_key


def sign_proof(data: dict) -> dict[str, str]:
    """
    Sign a JSON-serializable dict with the AEGIS Ed25519 key.

    Returns:
        {signature_hex, public_key_hex, algorithm}
    """
    private_key, public_key = _ensure_keypair()

    payload = json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")
    signature = private_key.sign(payload)

    pub_raw = public_key.public_bytes(Encoding.Raw, PublicFormat.Raw)

    return {
        "signature_hex": signature.hex(),
        "public_key_hex": pub_raw.hex(),
        "algorithm": "Ed25519",
    }


def get_public_key_hex() -> str:
    """Return the hex-encoded raw public key."""
    _, public_key = _ensure_keypair()
    pub_raw = public_key.public_bytes(Encoding.Raw, PublicFormat.Raw)
    return pub_raw.hex()
