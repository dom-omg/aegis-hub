"""
PDF Affidavit Generator — EVIDENTUM
Professional layout using fpdf2.
"""

from __future__ import annotations

import io
import textwrap
from datetime import datetime
from typing import Any

from fpdf import FPDF, XPos, YPos


# ---------------------------------------------------------------------------
# Colour palette
# ---------------------------------------------------------------------------
DARK_BG   = (15,  23,  42)   # slate-900
ACCENT    = (99, 102, 241)   # indigo-500
TEXT_DARK = (15,  23,  42)
TEXT_GREY = (100, 116, 139)  # slate-500
WHITE     = (255, 255, 255)
LIGHT_BG  = (248, 250, 252)  # slate-50
BORDER    = (226, 232, 240)  # slate-200


class AffidavitPDF(FPDF):
    """Custom FPDF subclass with EVIDENTUM styling."""

    def header(self) -> None:
        # Dark header bar
        self.set_fill_color(*DARK_BG)
        self.rect(0, 0, 210, 28, "F")

        # Left: EVIDENTUM wordmark
        self.set_xy(12, 6)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*WHITE)
        self.cell(80, 8, "EVIDENTUM", new_x=XPos.RIGHT, new_y=YPos.TOP)

        # Right: tagline
        self.set_xy(110, 6)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(148, 163, 184)  # slate-400
        self.cell(88, 8, "Proof Intelligence Engine", align="R",
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        # Accent stripe
        self.set_fill_color(*ACCENT)
        self.rect(0, 28, 210, 2, "F")

        self.ln(10)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*TEXT_GREY)
        self.cell(
            0, 10,
            f"EVIDENTUM Proof Intelligence · CONFIDENTIAL · Page {self.page_no()}",
            align="C",
        )

    # ------------------------------------------------------------------
    # Helper methods
    # ------------------------------------------------------------------

    def section_title(self, title: str) -> None:
        self.ln(3)
        self.set_fill_color(*ACCENT)
        self.rect(12, self.get_y(), 4, 6, "F")
        self.set_xy(18, self.get_y())
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*DARK_BG)
        self.cell(0, 6, title.upper(), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        # Thin separator
        self.set_draw_color(*BORDER)
        self.set_line_width(0.3)
        self.line(12, self.get_y(), 198, self.get_y())
        self.ln(3)

    def field_row(self, label: str, value: str, mono: bool = False) -> None:
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*TEXT_GREY)
        self.set_x(12)
        self.cell(52, 5, label, new_x=XPos.RIGHT, new_y=YPos.TOP)

        if mono:
            self.set_font("Courier", "", 7.5)
        else:
            self.set_font("Helvetica", "", 8.5)
        self.set_text_color(*TEXT_DARK)

        # Sanitize value — replace unicode math symbols with ASCII
        safe_value = self._ascii_safe(value)

        # Wrap long values
        max_chars = 95 if mono else 80
        lines = textwrap.wrap(safe_value, max_chars) or ["-"]
        first = True
        for line in lines:
            if not first:
                self.set_x(64)
            self.cell(134, 5, line, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            first = False
        self.ln(1)

    def verdict_badge(self, verdict: str) -> None:
        """Print a coloured verdict badge."""
        is_flagged = verdict == "FLAGGED"
        bg = (239, 68, 68) if is_flagged else (34, 197, 94)   # red-500 / green-500
        label = f"  {verdict}  "
        self.set_x(12)
        self.set_font("Helvetica", "B", 11)
        self.set_fill_color(*bg)
        self.set_text_color(*WHITE)
        self.cell(len(label) * 3.2, 9, label, fill=True,
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(3)

    @staticmethod
    def _ascii_safe(text: str) -> str:
        """Replace unicode math symbols with ASCII equivalents for Courier rendering."""
        replacements = {
            "∧": "AND",   # ∧
            "∨": "OR",    # ∨
            "¬": "NOT",   # ¬
            "∅": "{}",    # ∅
            "↔": "<->",   # ↔
            "→": "->",    # →
            "∃": "EX.",   # ∃
            "∀": "FA.",   # ∀
            "≤": "<=",    # ≤
            "≥": ">=",    # ≥
            "…": "...",   # …
            "·": ".",     # ·
            "—": "-",     # em-dash
            "–": "-", # en-dash
        }
        for uni, asc in replacements.items():
            text = text.replace(uni, asc)
        # Drop any remaining non-latin-1 chars
        return text.encode("latin-1", errors="replace").decode("latin-1")

    def code_block(self, text: str, max_lines: int = 20) -> None:
        """Render monospace code block with light background."""
        self.set_fill_color(*LIGHT_BG)
        self.set_draw_color(*BORDER)
        lines = text.split("\n")[:max_lines]
        block_h = len(lines) * 4.5 + 4
        x, y = 12, self.get_y()
        self.rect(x, y, 186, block_h, "FD")
        self.set_xy(x + 3, y + 2)
        self.set_font("Courier", "", 7)
        self.set_text_color(*TEXT_DARK)
        for line in lines:
            self.set_x(x + 3)
            safe_line = self._ascii_safe(line[:130])
            self.cell(180, 4.5, safe_line, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------

def generate_affidavit(
    wallet: str,
    chain: str,
    case_ref: str,
    z3_result: dict[str, Any],
    signature: dict[str, str],
    timestamp_info: dict[str, Any],
    transactions: list[dict[str, Any]],
) -> bytes:
    """
    Generate a professional EVIDENTUM PDF affidavit.
    Returns raw PDF bytes.
    """
    pdf = AffidavitPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    verdict = z3_result.get("verdict", "UNKNOWN")

    # ------------------------------------------------------------------
    # Title
    # ------------------------------------------------------------------
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*DARK_BG)
    pdf.set_x(12)
    pdf.cell(0, 10, "FORMAL PROOF CERTIFICATE", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*TEXT_GREY)
    pdf.set_x(12)
    pdf.cell(0, 5, "EVIDENTUM · Proof Intelligence Engine · Machine-Verifiable Evidence",
             new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(4)

    # ------------------------------------------------------------------
    # Section 1: Case Reference
    # ------------------------------------------------------------------
    pdf.section_title("1. Case Reference")
    pdf.field_row("Case Reference", case_ref or "EVIDENTUM-AUTO")
    pdf.field_row("Generated At", generated_at)
    pdf.field_row("Engine Version", "EVIDENTUM v1.0.0 · Z3 4.13")

    # ------------------------------------------------------------------
    # Section 2: Wallet Under Analysis
    # ------------------------------------------------------------------
    pdf.section_title("2. Wallet Under Analysis")
    pdf.field_row("Wallet Address", wallet, mono=True)
    pdf.field_row("Blockchain", chain.upper())
    pdf.field_row("Transactions Analyzed", str(len(transactions)))

    # Transaction table (first 10)
    if transactions:
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 7.5)
        pdf.set_fill_color(*DARK_BG)
        pdf.set_text_color(*WHITE)
        pdf.set_x(12)
        col_w = [60, 60, 28, 38]
        headers = ["FROM", "TO", "VALUE (ETH)", "TIMESTAMP"]
        for i, h in enumerate(headers):
            pdf.cell(col_w[i], 5, h, fill=True, border=0,
                     new_x=XPos.RIGHT, new_y=YPos.TOP)
        pdf.ln(5)
        pdf.set_font("Courier", "", 6.5)
        for idx, tx in enumerate(transactions[:10]):
            pdf.set_fill_color(LIGHT_BG if idx % 2 == 0 else WHITE)
            pdf.set_text_color(*TEXT_DARK)
            pdf.set_x(12)
            row = [
                str(tx.get("from", ""))[:18] + "..",
                str(tx.get("to", ""))[:18] + "..",
                f"{float(tx.get('value_eth', 0)):.4f}",
                str(tx.get("timestamp", ""))[:16],
            ]
            for i, cell in enumerate(row):
                pdf.cell(col_w[i], 4.5, cell, fill=True, border=0,
                         new_x=XPos.RIGHT, new_y=YPos.TOP)
            pdf.ln(4.5)
        pdf.ln(3)

    # ------------------------------------------------------------------
    # Section 3: Transaction Analysis
    # ------------------------------------------------------------------
    pdf.section_title("3. Transaction Analysis")
    patterns = z3_result.get("patterns_detail", {})
    pdf.field_row("SANCTIONED_HOP", "DETECTED" if patterns.get("SANCTIONED_HOP") else "CLEAR")
    pdf.field_row("STRUCTURING",    "DETECTED" if patterns.get("STRUCTURING")    else "CLEAR")
    pdf.field_row("MIXER",          "DETECTED" if patterns.get("MIXER")          else "CLEAR")
    pdf.field_row("LAYERING",       "DETECTED" if patterns.get("LAYERING")       else "CLEAR")
    pdf.field_row("Constraints Checked", str(z3_result.get("constraints_checked", 0)))

    # ------------------------------------------------------------------
    # Section 4: Z3 Formal Proof
    # ------------------------------------------------------------------
    pdf.section_title("4. Z3 Formal Proof")
    pdf.set_x(12)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*TEXT_DARK)
    pdf.cell(40, 6, "Verdict:", new_x=XPos.RIGHT, new_y=YPos.TOP)
    pdf.ln(6)
    pdf.verdict_badge(verdict)

    pdf.field_row("Proof Type",    z3_result.get("proof_type", "-"))
    pdf.field_row("Z3 Result",     z3_result.get("z3_result", "-"))
    pdf.field_row("Active Violations (UNSAT core)", z3_result.get("unsat_core", "∅"))

    # Constraint log
    constraint_log = z3_result.get("constraint_log", [])
    if constraint_log:
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*TEXT_GREY)
        pdf.set_x(12)
        pdf.cell(0, 5, "Z3 Constraint Log (first 20):",
                 new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.code_block("\n".join(constraint_log))

    # ------------------------------------------------------------------
    # Section 5: Cryptographic Signature
    # ------------------------------------------------------------------
    pdf.section_title("5. Cryptographic Signature")
    pdf.field_row("Algorithm",    signature.get("algorithm", "Ed25519"))
    pdf.field_row("Public Key",   signature.get("public_key_hex", ""), mono=True)
    pdf.field_row("Signature",    signature.get("signature_hex", ""), mono=True)

    # ------------------------------------------------------------------
    # Section 6: RFC 3161 Timestamp
    # ------------------------------------------------------------------
    pdf.section_title("6. RFC 3161 Timestamp")
    pdf.field_row("Timestamp",    timestamp_info.get("timestamp", ""))
    pdf.field_row("TSA",          timestamp_info.get("tsa", ""))
    pdf.field_row("RFC 3161",     "YES" if timestamp_info.get("rfc3161") else "NO (local fallback)")
    if timestamp_info.get("note"):
        pdf.field_row("Note", timestamp_info["note"])
    pdf.field_row("Digest SHA-256", timestamp_info.get("digest_sha256", ""), mono=True)

    # ------------------------------------------------------------------
    # Section 7: Legal Statement
    # ------------------------------------------------------------------
    pdf.section_title("7. Legal Statement")
    legal_text = (
        "This certificate was generated by the EVIDENTUM Proof Intelligence Engine. "
        "The formal proof presented herein constitutes machine-verifiable evidence "
        "suitable for court proceedings under applicable evidence law. "
        "The Z3 constraint system used to derive the verdict is deterministic and "
        "reproducible. The Ed25519 signature cryptographically binds this document "
        "to the EVIDENTUM signing authority. The RFC 3161 timestamp, where present, "
        "provides trusted third-party proof of the time of generation."
    )
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*TEXT_DARK)
    pdf.set_x(12)
    pdf.multi_cell(186, 5, legal_text)
    pdf.ln(4)

    # Signature line
    pdf.set_draw_color(*BORDER)
    pdf.set_line_width(0.5)
    pdf.line(12, pdf.get_y(), 100, pdf.get_y())
    pdf.ln(2)
    pdf.set_font("Helvetica", "I", 7.5)
    pdf.set_text_color(*TEXT_GREY)
    pdf.set_x(12)
    pdf.cell(0, 4, "Authorized by: EVIDENTUM Proof Intelligence Engine (automated)",
             new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()
