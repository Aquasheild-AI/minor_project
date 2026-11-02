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

LANGUAGE_NAMES = {
    'hi': 'Hindi (हिन्दी)',
    'en': 'English',
    'te': 'Telugu (తెలుగు)',
    'ta': 'Tamil (தமிழ்)',
    'bn': 'Bengali (বাংলা)',
    'mr': 'Marathi (मराठी)',
    'gu': 'Gujarati (ગુજરાતી)',
    'kn': 'Kannada (ಕನ್ನಡ)',
    'ml': 'Malayalam (മലയാളം)',
    'pa': 'Punjabi (ਪੰਜਾਬੀ)',
    'or': 'Odia (ଓଡ଼ିଆ)',
    'ur': 'Urdu (اردو)',
    'as': 'Assamese (অসমীয়া)',
    'es': 'Spanish (Español)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
    'ar': 'Arabic (العربية)',
    'ru': 'Russian (Русский)',
    'pt': 'Portuguese (Português)',
    'it': 'Italian (Italiano)',
    'ja': 'Japanese (日本語)',
    'zh': 'Chinese (中文)',
    'ko': 'Korean (한국어)',
    'tr': 'Turkish (Türkçe)',
    'nl': 'Dutch (Nederlands)',
    'id': 'Indonesian (Bahasa Indonesia)',
    'fa': 'Persian (فارسی)',
    'sw': 'Swahili (Kiswahili)',
}

def get_language_display_name(lang: str) -> str:
    if not lang:
        return 'English'
    code = str(lang).lower().strip()
    if code in LANGUAGE_NAMES:
        return LANGUAGE_NAMES[code]
    return str(lang).strip().capitalize()

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
    Supports English, Hindi, and any specific requested regional or global language.
    """
    api_key = get_api_key()
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set.")

    # Enhance system instruction with strict language enforcement
    norm_lang = str(lang).lower().strip() if lang else 'en'
    if norm_lang == 'hi':
        language_directive = (
            "\n\nCRITICAL LANGUAGE ENFORCEMENT:\n"
            "The user communicates in HINDI (हिन्दी).\n"
            "You MUST respond completely and naturally in HINDI using Devanagari script.\n"
            "Do NOT answer in English. All advice, explanations, and follow-up topics MUST be in Hindi.\n"
        )
    elif norm_lang == 'en':
        language_directive = (
            "\n\nCRITICAL LANGUAGE ENFORCEMENT:\n"
            "The user communicates in ENGLISH.\n"
            "You MUST respond in clear, simple English.\n"
            "All explanations and follow-up topics MUST be in English.\n"
        )
    else:
        lang_display = get_language_display_name(norm_lang)
        language_directive = (
            f"\n\nCRITICAL LANGUAGE ENFORCEMENT:\n"
            f"The user has requested to communicate in {lang_display.upper()}.\n"
            f"You MUST respond completely, naturally, and fluently in {lang_display} using its standard native script/alphabet.\n"
            f"Do NOT answer in English or Hindi unless specifically requested by the user.\n"
            f"All health explanations, hydration/ORS advice, emergency warnings, and follow-up topics MUST be written in {lang_display}.\n"
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
