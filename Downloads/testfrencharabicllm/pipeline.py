"""
Fenina Saida — Invoice Extraction Pipeline
Supports: Claude (Anthropic) | GPT-4o (OpenAI) | Gemini 2.5 Pro (Google)
"""

import os
import json
import base64
import time
import re
import psycopg2
from datetime import datetime
from pathlib import Path

# ─────────────────────────────────────────────
#  CONFIG — fill in your keys
# ─────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")      # from console.anthropic.com
OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY")          # from platform.openai.com
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY")         # from aistudio.google.com → API Keys

DB_CONFIG = {
    "host":     "localhost",
    "port":     5432,
    "dbname":   "fenina_db",
    "user":     "fenina_user",
    "password": "fenina_secure_2025",
}

INVOICES_FOLDER = "./invoices"        # put your .jpg/.png files here
RESULTS_FOLDER  = "./results"
LOGS_FOLDER     = "./logs"

# ─────────────────────────────────────────────
#  EXTRACTION PROMPT (strict JSON only)
# ─────────────────────────────────────────────
SYSTEM_PROMPT = """You are a document extraction system for Fenina Saida auto parts invoices.
Extract ONLY information visible in the image.
Return valid JSON only — no explanation, no markdown, no code blocks.
If a field is unreadable use null."""

USER_PROMPT = """Extract this Fenina Saida delivery note (Bon de Livraison) into JSON.

Return exactly this structure:
{
  "invoice_number": "string or null",
  "date": "DD/MM/YY or null",
  "client_name": "string (may be Arabic) or null",
  "items": [
    {
      "qty": number or null,
      "designation": "string or null",
      "unit_price": number or null,
      "total": number or null
    }
  ],
  "grand_total": number or null
}"""

# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────
def encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def parse_json_response(raw: str) -> dict:
    """Strip markdown fences and parse JSON safely."""
    raw = raw.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*",     "", raw)
    raw = re.sub(r"```$",        "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"error": "invalid_json", "raw": raw}


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


# ─────────────────────────────────────────────
#  MODEL EXTRACTORS
# ─────────────────────────────────────────────
def extract_claude(image_path: str) -> dict:
    """Claude claude-sonnet-4-6 via Anthropic API."""
    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    b64 = encode_image(image_path)
    ext = Path(image_path).suffix.lower()
    media = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media, "data": b64}},
                {"type": "text",  "text": USER_PROMPT},
            ]
        }]
    )
    return parse_json_response(response.content[0].text)


def extract_gpt(image_path: str) -> dict:
    """GPT-4o via OpenAI API."""
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
    b64 = encode_image(image_path)
    ext = Path(image_path).suffix.lower()
    media = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": SYSTEM_PROMPT + "\n\n" + USER_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:{media};base64,{b64}"}},
            ]
        }],
        max_tokens=1024,
    )
    return parse_json_response(response.choices[0].message.content)


def extract_gemini(image_path: str) -> dict:
    """Gemini 2.5 Pro via Google Generative AI."""
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-pro")

    import PIL.Image
    img = PIL.Image.open(image_path)
    response = model.generate_content([SYSTEM_PROMPT + "\n\n" + USER_PROMPT, img])
    return parse_json_response(response.text)


# ─────────────────────────────────────────────
#  POSTGRESQL STORAGE
# ─────────────────────────────────────────────
def save_to_db(data: dict, model_used: str, image_path: str, validated: bool = False):
    """Insert extracted invoice into fenina_db."""
    conn = psycopg2.connect(**DB_CONFIG)
    cur  = conn.cursor()

    # Make sure the raw_extractions table exists
    cur.execute("""
        CREATE TABLE IF NOT EXISTS raw_extractions (
            id             SERIAL PRIMARY KEY,
            image_path     TEXT,
            model_used     VARCHAR(30),
            invoice_number TEXT,
            client_name    TEXT,
            invoice_date   TEXT,
            grand_total    NUMERIC(12,3),
            items_json     JSONB,
            raw_json       JSONB,
            validated      BOOLEAN DEFAULT FALSE,
            extracted_at   TIMESTAMP DEFAULT NOW()
        )
    """)

    cur.execute("""
        INSERT INTO raw_extractions
            (image_path, model_used, invoice_number, client_name,
             invoice_date, grand_total, items_json, raw_json, validated)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        image_path,
        model_used,
        data.get("invoice_number"),
        data.get("client_name"),
        data.get("date"),
        data.get("grand_total"),
        json.dumps(data.get("items", []), ensure_ascii=False),
        json.dumps(data, ensure_ascii=False),
        validated,
    ))

    conn.commit()
    cur.close()
    conn.close()


# ─────────────────────────────────────────────
#  BENCHMARK SCORING
# ─────────────────────────────────────────────
def score_extraction(extracted: dict, ground_truth: dict) -> dict:
    """
    Compare extracted vs ground_truth.
    ground_truth is a dict you manually write for each test invoice.
    Returns per-metric accuracy.
    """
    results = {}

    # Client name — exact match (strip & lower)
    e_name = (extracted.get("client_name") or "").strip().lower()
    g_name = (ground_truth.get("client_name") or "").strip().lower()
    results["client_name_correct"] = e_name == g_name

    # Date
    results["date_correct"] = extracted.get("date") == ground_truth.get("date")

    # Invoice number
    results["number_correct"] = str(extracted.get("invoice_number", "")).strip() == \
                                 str(ground_truth.get("invoice_number", "")).strip()

    # Grand total — within 1% tolerance
    try:
        e_total = float(extracted.get("grand_total") or 0)
        g_total = float(ground_truth.get("grand_total") or 0)
        results["total_correct"] = abs(e_total - g_total) <= g_total * 0.01
    except Exception:
        results["total_correct"] = False

    # Items count match
    e_items = extracted.get("items") or []
    g_items = ground_truth.get("items") or []
    results["item_count_correct"] = len(e_items) == len(g_items)

    results["score"] = sum(1 for v in results.values() if v is True)
    results["max_score"] = 5
    return results


# ─────────────────────────────────────────────
#  MAIN PIPELINE
# ─────────────────────────────────────────────
def run_pipeline(model: str = "claude", save_db: bool = True, benchmark: bool = False):
    """
    model    : "claude" | "gpt" | "gemini"
    save_db  : save results to PostgreSQL
    benchmark: load ground_truth.json and score each extraction
    """
    extractors = {
        "claude": extract_claude,
        "gpt":    extract_gpt,
        "gemini": extract_gemini,
    }
    if model not in extractors:
        raise ValueError(f"Unknown model: {model}. Choose claude / gpt / gemini")

    extractor = extractors[model]
    images    = sorted(Path(INVOICES_FOLDER).glob("*.jpg")) + \
                sorted(Path(INVOICES_FOLDER).glob("*.png")) + \
                sorted(Path(INVOICES_FOLDER).glob("*.jpeg"))

    if not images:
        log(f"No images found in {INVOICES_FOLDER}. Put your invoice photos there.")
        return

    # Load ground truth if benchmarking
    ground_truths = {}
    if benchmark:
        gt_path = Path(INVOICES_FOLDER) / "ground_truth.json"
        if gt_path.exists():
            ground_truths = json.loads(gt_path.read_text(encoding="utf-8"))
            log(f"Loaded ground truth for {len(ground_truths)} invoices")
        else:
            log("WARNING: ground_truth.json not found — scoring disabled")
            benchmark = False

    log(f"Starting pipeline | model={model} | {len(images)} invoices")
    summary = {"total": len(images), "success": 0, "failed": 0, "scores": []}

    for i, img_path in enumerate(images, 1):
        log(f"[{i}/{len(images)}] Processing {img_path.name} ...")
        try:
            data = extractor(str(img_path))

            if "error" in data:
                log(f"  ✗ JSON parse error — raw saved")
                summary["failed"] += 1
            else:
                log(f"  ✓ #{data.get('invoice_number')} | {data.get('client_name')} | {data.get('grand_total')}")
                summary["success"] += 1

                # Score if benchmarking
                if benchmark and img_path.name in ground_truths:
                    sc = score_extraction(data, ground_truths[img_path.name])
                    data["_score"] = sc
                    summary["scores"].append(sc)
                    log(f"    Score: {sc['score']}/{sc['max_score']}")

                # Save to DB
                if save_db:
                    save_to_db(data, model, str(img_path))

            # Save individual result JSON
            out = Path(RESULTS_FOLDER) / f"{img_path.stem}_{model}.json"
            out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

        except Exception as e:
            log(f"  ✗ ERROR: {e}")
            summary["failed"] += 1

        time.sleep(0.5)   # be polite to the API

    # ── Final summary ──────────────────────────────
    log("\n" + "="*50)
    log(f"DONE | model={model}")
    log(f"  Success : {summary['success']}/{summary['total']}")
    log(f"  Failed  : {summary['failed']}/{summary['total']}")

    if summary["scores"]:
        metrics = ["client_name_correct","date_correct","number_correct","total_correct","item_count_correct"]
        log("\n  Benchmark accuracy:")
        for m in metrics:
            correct = sum(1 for s in summary["scores"] if s.get(m))
            total   = len(summary["scores"])
            pct     = correct / total * 100
            log(f"    {m:<25} {correct}/{total}  ({pct:.1f}%)")

    # Save run log
    log_path = Path(LOGS_FOLDER) / f"run_{model}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    log_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"\n  Log saved → {log_path}")


# ─────────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Fenina invoice extraction pipeline")
    parser.add_argument("--model",     default="claude", choices=["claude","gpt","gemini"])
    parser.add_argument("--no-db",     action="store_true", help="skip PostgreSQL save")
    parser.add_argument("--benchmark", action="store_true", help="score against ground_truth.json")
    args = parser.parse_args()

    run_pipeline(
        model     = args.model,
        save_db   = not args.no_db,
        benchmark = args.benchmark,
    )
