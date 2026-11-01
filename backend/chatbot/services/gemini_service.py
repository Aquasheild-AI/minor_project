import os
import logging
import requests
from dotenv import load_dotenv
from django.conf import settings

logger = logging.getLogger(__name__)

GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

# Active supported models in priority order
FALLBACK_MODELS = [
    os.getenv('GEMINI_MODEL_NAME', 'gemini-3.5-flash-lite'),
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-3.8-flash',
]

def get_api_key():
    load_dotenv(os.path.join(settings.BASE_DIR, '.env'))
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
    return api_key

def generate_chat_response(messages, system_instruction, context="", lang='en'):
    """
    Calls Gemini API with the given messages, system instruction, and language direction.
    Uses robust REST endpoint with fallback models and strict timeout.
    """
    api_key = get_api_key()
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set.")

    # Enhance system instruction with strict language enforcement
    if lang == 'hi':
        language_directive = (
            "\n\nCRITICAL LANGUAGE ENFORCEMENT:\n"
            "The user communicates in HINDI (हिन्दी).\n"
            "You MUST respond completely and naturally in HINDI using Devanagari script.\n"
            "Do NOT answer in English. All advice, explanations, and follow-up topics MUST be in Hindi.\n"
        )
    else:
        language_directive = (
            "\n\nCRITICAL LANGUAGE ENFORCEMENT:\n"
            "The user communicates in ENGLISH.\n"
            "You MUST respond in clear, simple English.\n"
            "All explanations and follow-up topics MUST be in English.\n"
        )

    full_system_instruction = f"{system_instruction.strip()}{language_directive}"

    # Format message history for Gemini API
    formatted_contents = []
    for msg in messages:
        role = "user" if msg.get('role') == 'user' else "model"
        formatted_contents.append({
            "role": role,
            "parts": [{"text": str(msg.get('content', ''))}]
        })

    # Prepend context from knowledge base to the latest user message
    if context and formatted_contents:
        last_msg = formatted_contents[-1]
        if last_msg["role"] == "user":
            orig_text = last_msg["parts"][0]["text"]
            last_msg["parts"][0]["text"] = (
                f"Knowledge Base Grounding Context:\n{context}\n\n"
                f"User Question: {orig_text}"
            )

    payload = {
        "system_instruction": {
            "parts": [{"text": full_system_instruction}]
        },
        "contents": formatted_contents,
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1200,
        }
    }

    last_exception = None

    # Try models in priority sequence
    for model_name in FALLBACK_MODELS:
        if not model_name:
            continue
        clean_model = model_name.replace("models/", "").strip()
        url = f"{GEMINI_API_BASE_URL}/{clean_model}:generateContent?key={api_key}"

        try:
            response = requests.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=12,
            )

            if response.status_code == 200:
                data = response.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"]

            # Log safe diagnostic without exposing API key
            logger.warning(
                "Gemini model '%s' returned HTTP %d: %s",
                clean_model,
                response.status_code,
                response.text[:200]
            )
            last_exception = RuntimeError(f"Model {clean_model} returned HTTP {response.status_code}")

        except requests.exceptions.RequestException as req_err:
            logger.warning(
                "Gemini model '%s' request failed: %s",
                clean_model,
                type(req_err).__name__
            )
            last_exception = req_err

    # If all models failed
    raise last_exception or RuntimeError("All Gemini API models failed to respond.")
