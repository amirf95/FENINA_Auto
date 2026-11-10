#!/usr/bin/env python3
"""
api.py — Batch invoice scanner using Claude Vision.

Token-saving design
-------------------
  ONE Claude call per image   extract number + date together (was 2 calls)
  Images resized to 1024 px   reduces image tokens ~75 % for phone photos
  File-hash cache             re-runs skip already-scanned images instantly
  Haiku by default            cheapest Claude vision model; accurate for OCR

Workflow
--------
  Pre-check   Fetch all existing invoice numbers from DB in one request.
  Scan        For each image: resize → single Claude call → number + date.
  Rename      Rename file to its normalized (zero-padded) invoice number.
  Filter      Drop any number already in DB.
  Register    POST each new invoice via register_existing with photo attached.
  Report      Print + save report.txt with full stats.

Required env vars (put them in api.env next to this file)
----------------------------------------------------------
  ANTHROPIC_API_KEY
  DJANGO_EMAIL
  DJANGO_PASSWORD

Optional env vars
-----------------
  CLIENT_ID        Force a client PK (default: auto-find/create client "XXX")
  DJANGO_BASE_URL  Default: http://localhost:8000/api
  IMAGES_DIR       Default: C:/Users/amirf/Downloads/TMN
  CLAUDE_MODEL     Default: claude-haiku-4-5-20251001
  MAX_IMG_PX       Resize longest side to this many pixels (default: 1024)
  DRY_RUN          Set to true to skip DB writes (default: false)
"""

import base64
import hashlib
import io
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

import anthropic
import requests
from dotenv import load_dotenv
from PIL import Image

# Load api.env before reading os.environ
load_dotenv(Path(__file__).resolve().parent / "api.env", override=True)

# ── Configuration ─────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
DJANGO_BASE_URL   = os.environ.get("DJANGO_BASE_URL", "http://localhost:8000/api")
DJANGO_EMAIL      = os.environ["DJANGO_EMAIL"]
DJANGO_PASSWORD   = os.environ["DJANGO_PASSWORD"]
CLIENT_ID         = int(os.environ["CLIENT_ID"]) if os.environ.get("CLIENT_ID") else None
IMAGES_DIR        = Path(os.environ.get("IMAGES_DIR", r"C:\Users\amirf\Downloads\TMN"))
CLAUDE_MODEL      = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
MAX_IMG_PX        = int(os.environ.get("MAX_IMG_PX", "1024"))
DRY_RUN           = os.environ.get("DRY_RUN", "false").lower() == "true"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MIME_MAP   = {
    ".jpg":  "image/jpeg", ".jpeg": "image/jpeg",
    ".png":  "image/png",  ".webp": "image/webp", ".gif": "image/gif",
}
CACHE_FILE = Path(__file__).resolve().parent / "scan_cache.json"

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("api.log", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

# ── API clients ───────────────────────────────────────────────────────────────

claude  = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
session = requests.Session()


# ── Report ────────────────────────────────────────────────────────────────────

@dataclass
class Report:
    started_at:  str = ""
    finished_at: str = ""
    images_found:    int = 0
    cache_hits:      int = 0   # skipped — already scanned in a previous run
    scan_ok:         int = 0
    scan_no_num:     int = 0
    scan_no_date:    int = 0   # date missing, fell back to today
    scan_error:      int = 0
    already_in_db:   int = 0
    new_to_register: int = 0
    registered_ok:   int = 0
    register_failed: int = 0
    skipped_rows: list = field(default_factory=list)
    failed_rows:  list = field(default_factory=list)
    success_rows: list = field(default_factory=list)

report = Report()


# ── Image helpers ─────────────────────────────────────────────────────────────

def list_images(folder: Path) -> list[Path]:
    return sorted(p for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTS)


def file_key(path: Path) -> str:
    """Stable hash of first 16 KB — fast and collision-resistant enough."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read(16_384))
    return h.hexdigest()[:20]


def resize_and_encode(path: Path) -> tuple[str, str]:
    """
    Resize image so its longest side is at most MAX_IMG_PX, then base64-encode.
    Returns (base64_string, media_type).
    Smaller image = fewer tokens = lower cost.
    """
    with Image.open(path) as img:
        img = img.convert("RGB")
        img.thumbnail((MAX_IMG_PX, MAX_IMG_PX), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=88)
    return base64.standard_b64encode(buf.getvalue()).decode(), "image/jpeg"


def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^\w\-]", "_", name).strip("_")
    return cleaned or "UNKNOWN"


def unique_path(target: Path) -> Path:
    if not target.exists():
        return target
    counter = 2
    while True:
        candidate = target.with_name(f"{target.stem}_{counter}{target.suffix}")
        if not candidate.exists():
            return candidate
        counter += 1


def normalize_number(number: str, length: int = 6) -> str:
    """Zero-pad purely numeric invoice numbers to `length` digits."""
    s = number.strip()
    return s.zfill(length) if s.isdigit() and len(s) < length else s


def is_valid_date(value: str) -> bool:
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False


# ── Cache ─────────────────────────────────────────────────────────────────────

def load_cache() -> dict:
    if CACHE_FILE.exists():
        try:
            return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_cache(cache: dict) -> None:
    CACHE_FILE.write_text(
        json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8"
    )


# ── Single-pass Claude scan ───────────────────────────────────────────────────

def scan_image(path: Path) -> dict | None:
    """
    ONE Claude call: extract invoice_number + invoice_date from a resized image.
    Returns {"invoice_number": str, "invoice_date": "YYYY-MM-DD"} or None.
    """
    b64, media_type = resize_and_encode(path)

    response = claude.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=120,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": media_type, "data": b64},
                },
                {
                    "type": "text",
                    "text": (
                        "Read this invoice or receipt image.\n"
                        "Return ONLY this JSON — no markdown, no explanation:\n"
                        '{"invoice_number": "00123", "invoice_date": "YYYY-MM-DD"}\n\n'
                        "Rules:\n"
                        "- invoice_number: copy EXACTLY as printed, keep all leading zeros, always a string.\n"
                        "- invoice_date: the date on the document in YYYY-MM-DD format.\n"
                        "- Use null for any field you cannot find.\n"
                        "- DO NOT include name, products, prices or totals."
                    ),
                },
            ],
        }],
    )

    raw = response.content[0].text.strip()
    raw = re.sub(r"^```[a-z]*\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"```\s*$",       "", raw, flags=re.MULTILINE).strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        log.error("  ✗ JSON parse error for %s — raw: %r", path.name, raw)
        return None

    raw_num = parsed.get("invoice_number")

    if isinstance(raw_num, int):
        log.warning(
            "  ⚠ invoice_number returned as integer (%s) for %s — leading zeros may be lost.",
            raw_num, path.name,
        )

    num = str(raw_num).strip() if raw_num is not None else None
    if not num or num.lower() in ("none", "null"):
        num = None
    if num:
        padded = normalize_number(num)
        if padded != num:
            log.info("  → Zero-padded: %s → %s", num, padded)
        num = padded

    raw_date = str(parsed.get("invoice_date") or "").strip() or None
    return {"invoice_number": num, "invoice_date": raw_date}


# ── Scan + rename all images ──────────────────────────────────────────────────

def scan_and_rename() -> list[dict]:
    """
    One Claude call per image. Results cached so re-runs are free.
    Returns list of {invoice_number, invoice_date, photo_path}.
    """
    images = list_images(IMAGES_DIR)
    report.images_found = len(images)

    if not images:
        log.warning("No images found in %s", IMAGES_DIR)
        return []

    cache = load_cache()
    log.info("Scanning %d image(s) — model: %s  max_px: %d",
             len(images), CLAUDE_MODEL, MAX_IMG_PX)

    results: list[dict] = []

    for img in images:
        key = file_key(img)

        # ── Cache hit: skip Claude entirely ──
        if key in cache:
            log.info("  ✓ [CACHED] %s → #%s  %s",
                     img.name, cache[key].get("invoice_number"), cache[key].get("invoice_date"))
            report.cache_hits += 1
            cached_path = Path(cache[key]["photo_path"])
            if cached_path.exists():
                cache[key]["photo_path"] = str(cached_path)
                results.append(cache[key])
            else:
                cache[key]["photo_path"] = str(img)
                results.append(cache[key])
            continue

        log.info("  Scanning %s …", img.name)
        try:
            info = scan_image(img)
        except Exception as exc:
            log.error("  ✗ Claude error on %s: %s", img.name, exc)
            report.scan_error += 1
            continue

        if not info or not info.get("invoice_number"):
            log.warning("  ⚠ No invoice number found in %s — skipping", img.name)
            report.scan_no_num += 1
            continue

        if not info.get("invoice_date") or not is_valid_date(info["invoice_date"]):
            log.warning("  ⚠ No valid date in %s — using today", img.name)
            info["invoice_date"] = date.today().isoformat()
            report.scan_no_date += 1

        # ── Rename file ──
        safe   = sanitize_filename(info["invoice_number"])
        target = unique_path(img.with_name(f"{safe}{img.suffix.lower()}"))
        if target != img:
            img.rename(target)
            log.info("  ✓ Renamed: %s → %s", img.name, target.name)
            img = target

        info["photo_path"] = str(img)
        report.scan_ok += 1

        # ── Save to cache immediately ──
        cache[key] = info
        save_cache(cache)

        results.append(info)
        log.info("  ✓ #%s  dated %s", info["invoice_number"], info["invoice_date"])
        time.sleep(0.15)   # light rate-limit

    return results


# ── Django API helpers ────────────────────────────────────────────────────────

def api_login() -> str:
    resp = session.post(
        f"{DJANGO_BASE_URL}/auth/login/",
        json={"email": DJANGO_EMAIL, "password": DJANGO_PASSWORD},
        timeout=15,
    )
    resp.raise_for_status()
    token = resp.json()["access"]
    log.info("Authenticated as %s", DJANGO_EMAIL)
    return token


def ensure_xxx_client(token: str) -> int:
    """Find or create a placeholder client named 'XXX'. Returns its PK."""
    headers = {"Authorization": f"Bearer {token}"}
    resp = session.get(f"{DJANGO_BASE_URL}/clients/", headers=headers,
                       params={"search": "XXX"}, timeout=15)
    resp.raise_for_status()
    data    = resp.json()
    clients = data if isinstance(data, list) else data.get("results", [])
    matches = [c for c in clients if c.get("name", "").strip().upper() == "XXX"]
    if matches:
        cid = matches[0]["id"]
        log.info("  Found existing client XXX — id=%d", cid)
        return cid
    resp = session.post(
        f"{DJANGO_BASE_URL}/clients/", headers=headers,
        json={"name": "XXX", "kind": "individual",
              "notes": "Placeholder — reassign invoices manually"},
        timeout=15,
    )
    resp.raise_for_status()
    cid = resp.json()["id"]
    log.info("  ✓ Created client XXX — id=%d", cid)
    return cid


def fetch_existing_numbers(token: str) -> set[str]:
    """Pull all invoice numbers from DB in one request."""
    log.info("Fetching existing invoice numbers from DB…")
    resp = session.get(f"{DJANGO_BASE_URL}/invoices/",
                       headers={"Authorization": f"Bearer {token}"}, timeout=30)
    resp.raise_for_status()
    data     = resp.json()
    invoices = data if isinstance(data, list) else data.get("results", [])
    numbers  = {normalize_number(inv["number"]) for inv in invoices}
    log.info("  %d invoice(s) already in DB.", len(numbers))
    return numbers


def precheck(items: list[dict], existing: set[str]) -> list[dict]:
    new = []
    for item in items:
        num = item["invoice_number"]
        if num in existing:
            log.warning("  ⚠ #%s already in DB — skipping", num)
            report.already_in_db += 1
            report.skipped_rows.append((num, Path(item["photo_path"]).name, "already in DB"))
        else:
            new.append(item)
    report.new_to_register = len(new)
    log.info("Pre-check done — %d new, %d already in DB.", len(new), report.already_in_db)
    return new


def register_invoice(token: str, client_id: int, number: str,
                     issue_date: str, photo_path: Path) -> dict:
    mime = MIME_MAP.get(photo_path.suffix.lower(), "image/jpeg")
    with open(photo_path, "rb") as fh:
        resp = session.post(
            f"{DJANGO_BASE_URL}/invoices/register_existing/",
            headers={"Authorization": f"Bearer {token}"},
            data={"client": client_id, "number": number, "issue_date": issue_date},
            files={"photo": (photo_path.name, fh, mime)},
            timeout=30,
        )
    resp.raise_for_status()
    return resp.json()


def register_all(items: list[dict], token: str, client_id: int) -> None:
    if not items:
        log.warning("Nothing to register.")
        return
    log.info("Registering %d invoice(s) under client id=%d%s…",
             len(items), client_id,
             "  [DRY RUN]" if DRY_RUN else "")

    for item in items:
        number     = item["invoice_number"]
        issue_date = item["invoice_date"]
        photo_path = Path(item["photo_path"])

        if DRY_RUN:
            log.info("  [DRY RUN] Would register #%s (%s)", number, issue_date)
            report.registered_ok += 1
            report.success_rows.append((number, photo_path.name, issue_date))
            continue

        log.info("  Registering #%s (%s) …", number, issue_date)
        try:
            result = register_invoice(token, client_id, number, issue_date, photo_path)
            log.info("  ✓ id=%s  number=%s  status=%s",
                     result.get("id"), result.get("number"), result.get("status"))
            report.registered_ok += 1
            report.success_rows.append((number, photo_path.name, issue_date))
        except requests.HTTPError as exc:
            code = exc.response.status_code if exc.response is not None else "?"
            body = exc.response.text        if exc.response is not None else ""
            log.error("  ✗ HTTP %s for #%s: %s", code, number, body)
            report.register_failed += 1
            report.failed_rows.append((number, photo_path.name, f"HTTP {code}: {body[:120]}"))
        except Exception as exc:
            log.error("  ✗ Error for #%s: %s", number, exc)
            report.register_failed += 1
            report.failed_rows.append((number, photo_path.name, str(exc)[:120]))


# ── Final report ──────────────────────────────────────────────────────────────

def print_report() -> None:
    r, W = report, 62
    lines = [
        "",
        "╔" + "═" * W + "╗",
        "║" + "  INVOICE SCAN REPORT".center(W) + "║",
        "║" + f"  {r.started_at}  →  {r.finished_at}".center(W) + "║",
        "╠" + "═" * W + "╣",
        "║" + "  SCAN".ljust(W) + "║",
        "║" + f"    Images found     : {r.images_found}".ljust(W) + "║",
        "║" + f"    Cache hits       : {r.cache_hits}  (free — already scanned)".ljust(W) + "║",
        "║" + f"    Claude calls     : {r.scan_ok + r.scan_error + r.scan_no_num}".ljust(W) + "║",
        "║" + f"    Scanned OK       : {r.scan_ok}".ljust(W) + "║",
        "║" + f"    No number found  : {r.scan_no_num}  (skipped)".ljust(W) + "║",
        "║" + f"    Date fallback    : {r.scan_no_date}  (used today)".ljust(W) + "║",
        "║" + f"    Errors           : {r.scan_error}".ljust(W) + "║",
        "╠" + "─" * W + "╣",
        "║" + "  PRE-CHECK".ljust(W) + "║",
        "║" + f"    Already in DB   : {r.already_in_db}  (skipped)".ljust(W) + "║",
        "║" + f"    New invoices     : {r.new_to_register}".ljust(W) + "║",
        "╠" + "─" * W + "╣",
        "║" + "  REGISTER".ljust(W) + "║",
        "║" + f"    ✓ Success        : {r.registered_ok}".ljust(W) + "║",
        "║" + f"    ✗ Failed         : {r.register_failed}".ljust(W) + "║",
    ]
    if r.success_rows:
        lines += ["╠" + "─" * W + "╣", "║" + "  REGISTERED".ljust(W) + "║"]
        for num, fname, d in r.success_rows:
            lines.append("║" + f"    #{num:<14} {d}  {fname}".ljust(W) + "║")
    if r.skipped_rows:
        lines += ["╠" + "─" * W + "╣", "║" + "  SKIPPED".ljust(W) + "║"]
        for num, fname, reason in r.skipped_rows:
            lines.append("║" + f"    #{num:<14} {reason}".ljust(W) + "║")
    if r.failed_rows:
        lines += ["╠" + "─" * W + "╣", "║" + "  FAILED".ljust(W) + "║"]
        for num, fname, err in r.failed_rows:
            lines.append("║" + f"    #{num:<14} {err}".ljust(W) + "║")
    lines += ["╚" + "═" * W + "╝", ""]

    text = "\n".join(lines)
    print(text)
    Path("report.txt").write_text(text, encoding="utf-8")
    log.info("Report saved to report.txt")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    if not IMAGES_DIR.is_dir():
        raise FileNotFoundError(f"Images folder not found: {IMAGES_DIR.resolve()}")

    report.started_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log.info("=" * 62)
    log.info("  Batch invoice scan — %s", IMAGES_DIR.resolve())
    log.info("  Model: %s  |  Max image size: %dpx  |  Dry run: %s",
             CLAUDE_MODEL, MAX_IMG_PX, DRY_RUN)
    log.info("=" * 62)

    token = api_login()

    client_id = CLIENT_ID if CLIENT_ID is not None else ensure_xxx_client(token)
    log.info("Target client id: %d", client_id)

    existing = fetch_existing_numbers(token)
    items    = scan_and_rename()
    items    = precheck(items, existing)
    register_all(items, token, client_id)

    report.finished_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print_report()


if __name__ == "__main__":
    main()
