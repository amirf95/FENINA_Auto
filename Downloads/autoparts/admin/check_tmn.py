#!/usr/bin/env python3
"""
check_tmn.py — Compare files in the TMN folder against the database.

Shows which files are NOT yet registered as invoices, and which DB invoices
have no matching file in the folder.

Reads credentials from api.env (same file as api.py).
"""

import os
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / "api.env", override=True)

# ── Config ────────────────────────────────────────────────────────────────────

DJANGO_BASE_URL = os.environ.get("DJANGO_BASE_URL", "http://localhost:8000/api")
DJANGO_EMAIL    = os.environ["DJANGO_EMAIL"]
DJANGO_PASSWORD = os.environ["DJANGO_PASSWORD"]
IMAGES_DIR      = Path(os.environ.get("IMAGES_DIR", r"C:\Users\amirf\Downloads\TMN"))

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

# ── Helpers ───────────────────────────────────────────────────────────────────

def normalize(number: str, length: int = 6) -> str:
    s = number.strip()
    return s.zfill(length) if s.isdigit() and len(s) < length else s


def login() -> str:
    resp = requests.post(
        f"{DJANGO_BASE_URL}/auth/login/",
        json={"email": DJANGO_EMAIL, "password": DJANGO_PASSWORD},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access"]


def fetch_db_numbers(token: str) -> dict[str, dict]:
    """Return {normalized_number: invoice_dict} for every invoice in the DB."""
    resp = requests.get(
        f"{DJANGO_BASE_URL}/invoices/",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    resp.raise_for_status()
    data     = resp.json()
    invoices = data if isinstance(data, list) else data.get("results", [])
    return {normalize(inv["number"]): inv for inv in invoices}


def fetch_folder_files() -> dict[str, Path]:
    """Return {normalized_stem: Path} for every image file in IMAGES_DIR."""
    if not IMAGES_DIR.is_dir():
        raise FileNotFoundError(f"Folder not found: {IMAGES_DIR}")
    return {
        normalize(p.stem): p
        for p in IMAGES_DIR.iterdir()
        if p.suffix.lower() in IMAGE_EXTS
    }

# ── Render ────────────────────────────────────────────────────────────────────

W = 66

def hr(char="─"): print(char * W)
def row(label, value, color=""): print(f"  {label:<34} {color}{value}\033[0m")

RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


def render(folder: dict[str, Path], db: dict[str, dict]) -> None:
    folder_keys = set(folder)
    db_keys     = set(db)

    not_in_db   = sorted(folder_keys - db_keys)   # files with no DB entry
    not_in_folder = sorted(db_keys - folder_keys)  # DB invoices with no file
    matched     = sorted(folder_keys & db_keys)

    print()
    print(f"{BOLD}{'  TMN FOLDER  ↔  DATABASE CHECK':^{W}}{RESET}")
    hr("═")
    row("Folder path", str(IMAGES_DIR))
    row("Files in folder",     len(folder), CYAN)
    row("Invoices in DB",      len(db),     CYAN)
    row("Matched (file + DB)", len(matched), GREEN)
    hr()

    # ── Files not in DB ──
    print(f"\n{BOLD}{RED}  FILES NOT IN DATABASE ({len(not_in_db)}){RESET}")
    hr()
    if not_in_db:
        print(f"  {'#':<20} {'Filename'}")
        hr("─")
        for num in not_in_db:
            print(f"  {RED}{num:<20}{RESET} {folder[num].name}")
    else:
        print(f"  {GREEN}All files are registered in the database.{RESET}")

    # ── DB invoices with no file ──
    print(f"\n{BOLD}{YELLOW}  DB INVOICES WITH NO FILE IN FOLDER ({len(not_in_folder)}){RESET}")
    hr()
    if not_in_folder:
        print(f"  {'#':<20} {'Client':<28} {'Date'}")
        hr("─")
        for num in not_in_folder:
            inv    = db[num]
            client = (inv.get("client_name") or "—")[:26]
            d      = inv.get("issue_date") or "—"
            has_photo = bool(inv.get("photo"))
            photo_tag = f" {CYAN}[photo]{RESET}" if has_photo else ""
            print(f"  {YELLOW}{num:<20}{RESET} {client:<28} {d}{photo_tag}")
    else:
        print(f"  {GREEN}Every DB invoice has a matching file in the folder.{RESET}")

    # ── Matched ──
    print(f"\n{BOLD}{GREEN}  MATCHED — FILE + DB ({len(matched)}){RESET}")
    hr()
    if matched:
        print(f"  {'#':<20} {'Filename':<28} {'Date':<14} {'Status'}")
        hr("─")
        for num in matched:
            inv    = db[num]
            fname  = folder[num].name[:26]
            d      = inv.get("issue_date") or "—"
            status = inv.get("status") or "—"
            color  = GREEN if status == "paid" else (YELLOW if status == "partial" else RED)
            print(f"  {num:<20} {fname:<28} {d:<14} {color}{status}{RESET}")

    hr("═")
    print(f"\n  {BOLD}Summary:{RESET}")
    print(f"    Files not in DB    : {RED}{len(not_in_db)}{RESET}")
    print(f"    DB entries missing : {YELLOW}{len(not_in_folder)}{RESET}")
    print(f"    Fully matched      : {GREEN}{len(matched)}{RESET}")
    print()


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    print("Connecting to DB…")
    token  = login()
    print("Fetching data…\n")
    db     = fetch_db_numbers(token)
    folder = fetch_folder_files()
    render(folder, db)


if __name__ == "__main__":
    main()
