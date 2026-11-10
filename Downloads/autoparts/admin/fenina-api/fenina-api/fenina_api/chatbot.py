"""
Server-side proxy for the storefront chatbot.

The Claude API key must never live in frontend code — anything shipped to the
browser (including Vite's VITE_-prefixed env vars) is public. This view holds
the key server-side and forwards a validated message list to Anthropic.
"""
import json
import os
import urllib.error
import urllib.request

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

SYSTEM_PROMPT = """Tu es un assistant virtuel expert pour Fenina Auto Parts, magasin de pièces automobiles à Hammamet, Tunisie.

Informations boutique:
• 5 000+ pièces en stock · 20+ marques partenaires · 10 ans d'expérience · 98% satisfaction
• Marques: Renault, Peugeot, Volkswagen, Citroën, Hyundai, Fiat, Toyota, Kia et autres
• Services: recherche par véhicule ou photo, conseil expert, devis WhatsApp, livraison rapide
• Contact: WhatsApp pour commandes et devis

Sois concis, professionnel et chaleureux. Adapte-toi à la langue du client (FR/AR/EN)."""

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 420
MAX_MESSAGES = 30
MAX_MESSAGE_LENGTH = 2000


class ChatbotRateThrottle(AnonRateThrottle):
    scope = "chatbot"


def _validate_messages(raw):
    """Returns a cleaned {role, content} list, or None if the payload is malformed."""
    if not isinstance(raw, list) or not raw or len(raw) > MAX_MESSAGES:
        return None
    cleaned = []
    for m in raw:
        if not isinstance(m, dict):
            return None
        role = m.get("role")
        content = m.get("content")
        if role not in ("user", "assistant") or not isinstance(content, str):
            return None
        content = content.strip()
        if not content or len(content) > MAX_MESSAGE_LENGTH:
            return None
        cleaned.append({"role": role, "content": content})
    return cleaned


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ChatbotRateThrottle])
def chatbot(request):
    messages = _validate_messages(request.data.get("messages"))
    if messages is None:
        return Response({"detail": "Invalid messages payload."}, status=status.HTTP_400_BAD_REQUEST)

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return Response(
            {"detail": "Chatbot is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    payload = json.dumps({
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "system": SYSTEM_PROMPT,
        "messages": messages,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError):
        return Response(
            {"detail": "Unable to reach the assistant right now."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    reply = next(
        (block.get("text", "") for block in data.get("content", []) if block.get("type") == "text"),
        "",
    )
    return Response({"reply": reply or "Désolé, veuillez réessayer."})
