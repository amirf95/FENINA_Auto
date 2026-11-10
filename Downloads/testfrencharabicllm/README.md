# Fenina Saida — Invoice Extraction Pipeline

## Setup (one time)

```bash
pip install -r requirements.txt
```

## Folder structure

```
fenina_pipeline/
├── pipeline.py          ← main script
├── requirements.txt
├── invoices/            ← PUT YOUR PHOTOS HERE
│   ├── 4296.jpg
│   ├── 4297.jpg
│   └── ground_truth.json   ← your manual answers for scoring
├── results/             ← extracted JSON saved here per invoice
└── logs/                ← run summaries saved here
```

## Step 1 — Add your API keys in pipeline.py

```python
ANTHROPIC_API_KEY = "sk-ant-..."    # console.anthropic.com
OPENAI_API_KEY    = "sk-..."        # platform.openai.com
GEMINI_API_KEY    = "AIza..."       # aistudio.google.com → Get API Key (FREE)
```

## Step 2 — Put invoice photos in /invoices folder

Copy your .jpg or .png photos into the invoices/ folder.

## Step 3 — Run the pipeline

```bash
# Test with Claude only (no DB save, first try)
python pipeline.py --model claude --no-db

# Test with Gemini (free, no key cost)
python pipeline.py --model gemini --no-db

# Test with GPT-4o
python pipeline.py --model gpt --no-db

# Full run with DB save
python pipeline.py --model claude

# Full benchmark with scoring
python pipeline.py --model claude --benchmark
```

## Step 4 — Fill in ground_truth.json for scoring

For each invoice you want to score, add an entry in invoices/ground_truth.json:
```json
{
  "4296.jpg": {
    "invoice_number": "004296",
    "date": "23/10/23",
    "client_name": "اسم العميل",
    "grand_total": 13680,
    "items": [...]
  }
}
```

## Step 5 — Run benchmark

```bash
python pipeline.py --model claude --benchmark --no-db
python pipeline.py --model gemini --benchmark --no-db
python pipeline.py --model gpt    --benchmark --no-db
```

Compare the accuracy scores printed at the end.

## What gets saved to PostgreSQL

Table: `raw_extractions`
- image_path
- model_used (claude / gpt / gemini)
- invoice_number
- client_name
- invoice_date
- grand_total
- items_json (full line items as JSONB)
- raw_json (full extraction as JSONB)
- validated (false until human confirms)
- extracted_at (timestamp)

## Benchmark metrics explained

| Metric | What it checks |
|---|---|
| client_name_correct | Arabic name extracted correctly |
| date_correct | Date matches ground truth exactly |
| number_correct | Invoice number matches |
| total_correct | Grand total within 1% of real value |
| item_count_correct | Number of line items matches |

## Cost estimate

| Model | Cost per invoice | 50 invoices |
|---|---|---|
| Claude Sonnet 4.6 | ~$0.02 | ~$1.00 |
| GPT-4o | ~$0.02 | ~$1.00 |
| Gemini 2.5 Pro | FREE | FREE |
