"""Best-effort external product lookup by barcode, used to help staff fill
in the "add part" form. Never raises — a flaky/unreachable provider should
just mean no suggestion, not a broken part-creation flow.
"""
import os

import requests

UPCITEMDB_TRIAL_URL = "https://api.upcitemdb.com/prod/trial/lookup"
UPCITEMDB_PAID_URL = "https://api.upcitemdb.com/prod/v1/lookup"


def lookup_external(barcode):
    """Look up a barcode via UPCitemdb. Returns a dict with whichever of
    {name, brand, category} the provider returned, or None if there was no
    match or the lookup failed. Uses the free trial tier unless
    UPCITEMDB_API_KEY is set in the environment, in which case it calls the
    paid endpoint with the same response shape — no other code needs to
    change to upgrade tiers.
    """
    api_key = os.getenv("UPCITEMDB_API_KEY", "")
    url = UPCITEMDB_PAID_URL if api_key else UPCITEMDB_TRIAL_URL
    headers = {"user_key": api_key, "key_type": "3scale"} if api_key else {}

    try:
        response = requests.get(
            url, params={"upc": barcode}, headers=headers, timeout=5
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError):
        return None

    items = data.get("items") or []
    if not items:
        return None

    item = items[0]
    suggestion = {}
    if item.get("title"):
        suggestion["name"] = item["title"]
    if item.get("brand"):
        suggestion["brand"] = item["brand"]
    if item.get("category"):
        suggestion["category"] = item["category"]
    return suggestion or None
