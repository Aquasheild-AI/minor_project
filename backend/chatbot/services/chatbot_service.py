import json
import re
import logging
from .knowledge_base import KnowledgeBase
from .gemini_service import generate_chat_response

logger = logging.getLogger(__name__)

# System instruction for Gemini
SYSTEM_INSTRUCTION = """
You are the "AquaShield AI Community Health Assistant", a friendly, empathetic, and culturally aware AI health assistant for rural community members.
Your scope covers water-borne disease education, symptoms, prevention, sanitation, safe drinking water, ORS preparation, and community health awareness.

CRITICAL MEDICAL & SAFETY RULES:
1. You are an educational tool, NOT a doctor, and you CANNOT diagnose illnesses or prescribe medicines.
2. NEVER say "You have [disease]", "Your symptoms confirm [disease]", or "You definitely have [disease]".
3. Use phrases like "These symptoms can be associated with...", "In community health, such symptoms often occur with...", or "यह लक्षण कई कारणों से हो सकते हैं...".
4. NEVER prescribe antibiotics or specific pharmaceutical dosages. Always urge evaluation by a qualified medical professional.
5. If emergency warning signs are present (blood in stool, inability to keep fluids down, extreme lethargy, sunken eyes, high fever >3 days), urgently instruct the user to visit the nearest Primary Health Centre (PHC), Community Health Centre, or consult an ASHA/ANM worker.
6. Use simple, direct, respectful language appropriate for rural community members. Avoid complicated medical jargon.
7. Always advise on safe hydration (ORS / clean boiled water) when gastrointestinal symptoms or diarrhea are mentioned.
8. FORMATTING REQUIREMENT: At the very end of your response, provide exactly 2 or 3 relevant follow-up topics separated by `---FOLLOW_UPS---`. The options MUST be a valid JSON array format.

Example follow-up format:
---FOLLOW_UPS---
[
  {"type": "topic", "label": "How to prepare ORS at home?", "value": "How do I safely prepare ORS at home?"},
  {"type": "topic", "label": "Safe Drinking Water Steps", "value": "How can I make my drinking water safe?"}
]
"""

# ─── Language Detection & Persistence ────────────────────────────────────────

LANGUAGE_CATALOG = {
    'hi': {'name': 'Hindi', 'native': 'हिन्दी', 'aliases': ['hindi', 'hindustani', 'हिंदी', 'हिन्दी']},
    'en': {'name': 'English', 'native': 'English', 'aliases': ['english', 'angrezi', 'angreji', 'अंग्रेजी']},
    'te': {'name': 'Telugu', 'native': 'తెలుగు', 'aliases': ['telugu', 'telegu', 'తెలుగు', 'तेलुगु', 'तेलगु']},
    'ta': {'name': 'Tamil', 'native': 'தமிழ்', 'aliases': ['tamil', 'thamizh', 'தமிழ்', 'तमिल']},
    'bn': {'name': 'Bengali', 'native': 'বাংলা', 'aliases': ['bengali', 'bangla', 'বাংলা', 'बंगाली', 'बांग्ला']},
    'mr': {'name': 'Marathi', 'native': 'मराठी', 'aliases': ['marathi', 'मराठी']},
    'gu': {'name': 'Gujarati', 'native': 'ગુજરાતી', 'aliases': ['gujarati', 'gujrati', 'ગુજરાતી', 'गुजराती']},
    'kn': {'name': 'Kannada', 'native': 'ಕನ್ನಡ', 'aliases': ['kannada', 'kanada', 'ಕನ್ನಡ', 'कन्नड़']},
    'ml': {'name': 'Malayalam', 'native': 'മലയാളം', 'aliases': ['malayalam', 'മലയാളം', 'मलयालम']},
    'pa': {'name': 'Punjabi', 'native': 'ਪੰਜਾਬੀ', 'aliases': ['punjabi', 'panjabi', 'ਪੰਜਾਬੀ', 'पंजाबी']},
    'or': {'name': 'Odia', 'native': 'ଓଡ଼ିଆ', 'aliases': ['odia', 'oriya', 'ଓଡ଼ିଆ', 'ओड़िया', 'उड़िया']},
    'ur': {'name': 'Urdu', 'native': 'اردو', 'aliases': ['urdu', 'اردو', 'उर्दू']},
    'as': {'name': 'Assamese', 'native': 'অসমীয়া', 'aliases': ['assamese', 'asamiya', 'অসমীয়া', 'असमिया']},
    'es': {'name': 'Spanish', 'native': 'Español', 'aliases': ['spanish', 'espanol', 'español', 'castellano', 'स्पैनिश', 'स्पेनिश']},
    'fr': {'name': 'French', 'native': 'Français', 'aliases': ['french', 'francais', 'français', 'फ्रेंच']},
    'de': {'name': 'German', 'native': 'Deutsch', 'aliases': ['german', 'deutsch', 'जर्मन']},
    'ar': {'name': 'Arabic', 'native': 'العربية', 'aliases': ['arabic', 'arab', 'العربية', 'عربي', 'अरबी']},
    'ru': {'name': 'Russian', 'native': 'Русский', 'aliases': ['russian', 'русский', 'रूसी']},
    'pt': {'name': 'Portuguese', 'native': 'Português', 'aliases': ['portuguese', 'portugues', 'português', 'पुर्तगाली']},
    'it': {'name': 'Italian', 'native': 'Italiano', 'aliases': ['italian', 'italiano', 'इतालवी']},
    'ja': {'name': 'Japanese', 'native': '日本語', 'aliases': ['japanese', 'nihongo', '日本語', 'जापानी']},
    'zh': {'name': 'Chinese', 'native': '中文', 'aliases': ['chinese', 'mandarin', 'zhongwen', '中文', 'चीनी']},
    'ko': {'name': 'Korean', 'native': '한국어', 'aliases': ['korean', 'hangul', '한국어', 'कोरियाई']},
    'tr': {'name': 'Turkish', 'native': 'Türkçe', 'aliases': ['turkish', 'turkce', 'türkçe', 'तुर्की']},
    'sw': {'name': 'Swahili', 'native': 'Kiswahili', 'aliases': ['swahili', 'kiswahili']},
}

def resolve_language_identifier(text: str):
    if not text:
        return None
    w = str(text).strip().lower()
    for code, info in LANGUAGE_CATALOG.items():
        if w == code or w == info['name'].lower() or w in [a.lower() for a in info['aliases']]:
            return code
    if len(w) >= 3 and w.isalpha():
        return w.capitalize()
    return None

def is_devanagari(text: str) -> bool:
    return bool(re.search(r'[\u0900-\u097F]', text or ''))

def is_explicit_hindi_request(text: str) -> bool:
    t = (text or '').lower().strip()
    patterns = [
        'हिंदी में बात करो', 'हिंदी में बोलो', 'हिंदी बोलो', 'हिंदी में बात करें',
        'हिंदी में बताइए', 'हिंदी में बताओ', 'talk in hindi', 'speak in hindi',
        'switch to hindi', 'in hindi', 'hindi please', 'hindi me baat karo',
        'hindi me bolo', 'hindi mein bolo', 'hindi me bataye', 'hindi mein',
        'hindi me', 'hindi mein bataye'
    ]
    return any(p in t for p in patterns)

def is_explicit_english_request(text: str) -> bool:
    t = (text or '').lower().strip()
    patterns = [
        'talk in english', 'speak in english', 'switch to english', 'switch back to english',
        'in english', 'english please', 'english me baat karo', 'english me bolo',
        'english mein bolo', 'अंग्रेजी में बात करो', 'अंग्रेजी में बोलो', 'english only'
    ]
    return any(p in t for p in patterns)

def detect_explicit_language_request(text: str):
    """
    Detects if the user requested a specific language across English, Hindi,
    Indian regional languages, or any global language.
    """
    t = (text or '').strip().lower()
    if not t:
        return None

    if is_explicit_hindi_request(t):
        return 'hi'
    if is_explicit_english_request(t):
        return 'en'

    # Native/regional switch phrases
    if any(p in t for p in ['habla en español', 'hablemos en español', 'en español']):
        return 'es'
    if any(p in t for p in ['parle en français', 'parlez en français', 'en français']):
        return 'fr'
    if any(p in t for p in ['sprechen sie deutsch', 'auf deutsch']):
        return 'de'
    if any(p in t for p in ['తెలుగులో మాట్లాడు', 'తెలుగులో మాట్లాడండి', 'తెలుగులో చెప్పు', 'తెలుగులో చెప్పండి']):
        return 'te'
    if any(p in t for p in ['தமிழில் பேசுங்கள்', 'தமிழில் சொல்லுங்கள்']):
        return 'ta'
    if any(p in t for p in ['বাংলায় বলুন', 'বাংলায় কথা বলুন']):
        return 'bn'
    if any(p in t for p in ['मराठीत बोला', 'मराठी मध्ये बोला', 'मराठीत सांगा']):
        return 'mr'
    if any(p in t for p in ['ગુજરાતીમાં બોલો', 'ગુજરાતીમાં વાત કરો']):
        return 'gu'

    patterns = [
        r'(?:talk|speak|chat|reply|answer|communicate|write|respond)\s+(?:to\s+me\s+)?in\s+([a-zA-Z\u00C0-\u024F\u0900-\u097F]+)',
        r'(?:switch|change)\s+(?:(?:the\s+)?language\s+to\s+|back\s+to\s+|to\s+)([a-zA-Z\u00C0-\u024F\u0900-\u097F]+)',
        r'(?:can\s+you\s+)?(?:speak|talk)\s+([a-zA-Z\u00C0-\u024F]+)',
        r'\bin\s+([a-zA-Z\u00C0-\u024F]+)\s+please\b',
        r'\b([a-zA-Z\u00C0-\u024F]+)\s+please\b',
        r'\b([a-zA-Z\u00C0-\u024F]+)\s+only\b',
        r'\b([a-zA-Z\u00C0-\u024F]+)\s+(?:me|mein)\s+(?:baat\s+karo|bolo|bataye|samjhao|likho)',
        r'\b([a-zA-Z\u00C0-\u024F]+)\s+(?:lo|la|te|dalli|il)\s+(?:cheppandi|matladandi|pesunga|bolun|samsarikku|heli|katha\s+kuhantu)',
        r'([\u0900-\u097F]+)\s+में\s+(?:बात\s+करो|बोलो|बताइए|बताओ|लिखिए)',
    ]
    for p in patterns:
        m = re.search(p, t, re.I)
        if m:
            candidate = resolve_language_identifier(m.group(1))
            if candidate:
                return candidate
    return None

def detect_script_language(text: str):
    """
    Detects language based on non-Latin Unicode script ranges.
    """
    if not text:
        return None
    if re.search(r'[\u0C00-\u0C7F]', text): return 'te' # Telugu
    if re.search(r'[\u0B80-\u0BFF]', text): return 'ta' # Tamil
    if re.search(r'[\u0980-\u09FF]', text): return 'bn' # Bengali / Assamese
    if re.search(r'[\u0A80-\u0AFF]', text): return 'gu' # Gujarati
    if re.search(r'[\u0A00-\u0A7F]', text): return 'pa' # Gurmukhi / Punjabi
    if re.search(r'[\u0C80-\u0CFF]', text): return 'kn' # Kannada
    if re.search(r'[\u0D00-\u0D7F]', text): return 'ml' # Malayalam
    if re.search(r'[\u0B00-\u0B7F]', text): return 'or' # Odia
    if re.search(r'[\u0600-\u06FF]', text): return 'ur' # Arabic / Urdu
    if re.search(r'[\u0400-\u04FF]', text): return 'ru' # Cyrillic
    if re.search(r'[\u3040-\u30FF]', text): return 'ja' # Japanese
    if re.search(r'[\uAC00-\uD7AF]', text): return 'ko' # Korean
    if re.search(r'[\u0900-\u097F]', text):
        marathi_markers = ['आहे', 'नाही', 'कसे', 'करावे', 'सांगा', 'लक्षणे', 'मराठी', 'पाणी']
        if any(w in text for w in marathi_markers):
            return 'mr'
        return 'hi' # Priority default for Devanagari is Hindi
    return None

def determine_language(user_message: str, history: list, user_pref: str = None) -> str:
    """
    Determines conversation language with turn-by-turn persistence.
    English and Hindi are priority default languages, but any specific requested
    or detected language is fully supported and maintained across turns.
    """
    msg = user_message or ''

    # 1. Current message explicit switch request
    explicit_lang = detect_explicit_language_request(msg)
    if explicit_lang:
        return explicit_lang

    # 2. Distinct non-Latin script in current message
    script_lang = detect_script_language(msg)
    if script_lang:
        return script_lang

    # 3. Check recent conversation history for established language persistence
    for item in reversed(history[-10:]):
        content = item.get('content', '')
        h_explicit = detect_explicit_language_request(content)
        if h_explicit:
            return h_explicit
        h_script = detect_script_language(content)
        if h_script:
            return h_script

    # 4. Fallback to user profile preference if non-English
    if user_pref and str(user_pref).strip().lower() not in ['en', 'none', '']:
        resolved_pref = resolve_language_identifier(str(user_pref))
        if resolved_pref:
            return resolved_pref

    # 5. Default English
    return 'en'


# ─── Intent Detection & Context Extraction ────────────────────────────────────

def detect_intent_and_context(user_message: str, kb: KnowledgeBase, lang: str):
    """
    Bilingual & multilingual heuristic intent detection and knowledge base grounding.
    """
    msg_lower = (user_message or '').lower().strip()

    # 0. Language Switch intent
    explicit_switch = detect_explicit_language_request(user_message)
    if explicit_switch:
        return "language_switch", f"User explicitly requested to switch language to {lang}."

    # 1. ORS Preparation & Usage
    ors_keywords = [
        'ors', 'oral rehydration', 'rehydration salt', 'electrolyte', 'prepare ors',
        'make ors', 'ors recipe', 'ors solution', 'dehydration drink',
        'ओआरएस', 'जीवन रक्षक घोल', 'ओआरएस कैसे बनाएं', 'घोल बनाने की विधि',
        'घोल कैसे बनाएं', 'ओआरएस पैकेट', 'घरेलू घोल'
    ]
    if any(kw in msg_lower for kw in ors_keywords):
        ors_data = kb.get_ors_guidelines(lang)
        return "ors_preparation", json.dumps(ors_data, ensure_ascii=False)

    # 2. Specific Disease Queries (Typhoid, Cholera, Dysentery, Hepatitis, Diarrhea)
    typhoid_keywords = ['typhoid', 'enteric fever', 'salmonella', 'टाइफाइड', 'मियादी बुखार', 'मोतीझरा']
    if any(kw in msg_lower for kw in typhoid_keywords):
        cond = kb.get_condition_by_name('typhoid_fever')
        return "disease_typhoid", json.dumps(cond, ensure_ascii=False) if cond else "Typhoid information."

    cholera_keywords = ['cholera', 'vibrio', 'rice water', 'हैजा', 'चावल जैसे दस्त']
    if any(kw in msg_lower for kw in cholera_keywords):
        cond = kb.get_condition_by_name('cholera')
        return "disease_cholera", json.dumps(cond, ensure_ascii=False) if cond else "Cholera information."

    dysentery_keywords = ['dysentery', 'amoebic', 'shigella', 'पेचिश', 'मरोड़', 'आंव']
    if any(kw in msg_lower for kw in dysentery_keywords):
        cond = kb.get_condition_by_name('acute_diarrhoeal_disease')
        return "disease_dysentery", json.dumps(cond, ensure_ascii=False) if cond else "Dysentery information."

    hepatitis_keywords = ['hepatitis', 'jaundice', 'yellow urine', 'yellow eyes', 'पीलिया', 'हेपेटाइटिस']
    if any(kw in msg_lower for kw in hepatitis_keywords):
        cond = kb.get_condition_by_name('hepatitis_a')
        return "disease_hepatitis", json.dumps(cond, ensure_ascii=False) if cond else "Hepatitis information."

    diarrhea_keywords = ['diarrhea', 'diarrhoea', 'loose motion', 'watery stool', 'दस्त', 'डायरिया', 'पतले दस्त']
    if any(kw in msg_lower for kw in diarrhea_keywords):
        cond = kb.get_condition_by_name('acute_diarrhoeal_disease')
        return "disease_diarrhea", json.dumps(cond, ensure_ascii=False) if cond else "Diarrhea information."

    # 3. Water Quality & Contamination
    water_quality_keywords = [
        'water quality', 'contamination', 'contaminated water', 'dirty water',
        'turbidity', 'ph', 'chlorine', 'tds', 'smell in water', 'foul water',
        'handpump', 'well water', 'water test', 'water testing', 'pipe leak',
        'पानी की गुणवत्ता', 'दूषित पानी', 'गंदा पानी', 'पानी में बदबू', 'पीला पानी',
        'हैंडपंप का पानी', 'कुएं का पानी', 'पानी की जांच', 'क्लोरीन', 'टर्बिडिटी'
    ]
    if any(kw in msg_lower for kw in water_quality_keywords):
        wq = kb.get_water_quality_guidelines()
        return "water_quality_and_contamination", json.dumps(wq, ensure_ascii=False)

    # 4. Safe Drinking Water Treatment
    safe_water_keywords = [
        'safe drinking water', 'safe water', 'boil water', 'boiling water',
        'purify water', 'clean water', 'filter water', 'chlorine tablet', 'water treatment',
        'पीने का साफ पानी', 'सुरक्षित पानी', 'पानी उबालना', 'पानी कैसे साफ करें', 'पानी शुद्ध कैसे करें'
    ]
    if any(kw in msg_lower for kw in safe_water_keywords):
        return "safe_drinking_water", "Safe drinking water: boil for 10+ minutes, store in closed narrow-mouth vessel, use clean ladle or tap."

    # 5. When to Visit PHC / Health Worker Consultation
    phc_keywords = [
        'phc', 'chc', 'asha', 'anm', 'health worker', 'doctor', 'hospital', 'clinic',
        'when to see a doctor', 'when to visit phc', 'reach asha',
        'प्राथमिक स्वास्थ्य केंद्र', 'पीएचसी', 'आशा', 'आशा दीदी', 'एएनएम',
        'स्वास्थ्य कार्यकर्ता', 'डॉक्टर को कब दिखाएं', 'अस्पताल कब जाएं'
    ]
    if any(kw in msg_lower for kw in phc_keywords):
        return "phc_consultation", "Consult ASHA/ANM for early hydration and reporting. Visit PHC immediately for severe warning signs."

    # 6. Warning Signs / Red Flags
    if kb.detect_warning_signs(user_message):
        return "warning_signs", "URGENT: Red flag symptoms detected. Instruct user to seek immediate emergency medical care."

    # 7. Symptom Guidance
    symptom_keywords = [
        'fever', 'pain', 'vomit', 'vomiting', 'sick', 'weakness', 'headache', 'cramp', 'nausea',
        'बुखार', 'उल्टी', 'दर्द', 'कमजोरी', 'सिरदर्द', 'पेट दर्द', 'जी मिचलाना'
    ]
    if any(kw in msg_lower for kw in symptom_keywords):
        matches = kb.find_matching_conditions(user_message)
        context = {"matched_rules": matches, "safety_rules": kb.get_global_safety_rules()}
        return "symptom_guidance", json.dumps(context, ensure_ascii=False)

    # 8. General Prevention
    prevention_keywords = ['prevent', 'prevention', 'hygiene', 'wash hands', 'sanitation', 'बचाव', 'सावधानी', 'हाथ धोना']
    if any(kw in msg_lower for kw in prevention_keywords):
        return "prevention", "General hygiene: wash hands with soap, drink treated water, maintain sanitation."

    return "general_or_unknown", ""


# ─── Context-Aware Offline Fallback Generator ─────────────────────────────────

MULTILINGUAL_GREETINGS = {
    'es': {
        'greeting': (
            "¡Hola! Ahora nos comunicaremos en español. Soy tu Asistente de Salud Comunitaria de AquaShield.\n\n"
            "Puedes preguntarme sobre enfermedades transmitidas por el agua (como tifoidea, cólera, diarrea), "
            "preparación de suero oral (SRO/ORS), purificación de agua o cuándo acudir a un centro de salud.\n"
            "¿En qué puedo ayudarte hoy?"
        ),
        'follow_ups': [
            {"type": "topic", "label": "Síntomas de la tifoidea", "value": "¿Cuáles son los síntomas de la tifoidea?"},
            {"type": "topic", "label": "¿Cómo preparar suero oral (SRO)?", "value": "¿Cómo preparar suero oral en casa?"}
        ]
    },
    'te': {
        'greeting': (
            "నమస్కారం! ఇకపై నేను మీతో తెలుగులో మాట్లాడతాను. నేను మీ ఆక్వాషీಲ್డ్ కమ్యూనిటీ హెల్త్ అసిస్టెంట్‌ని.\n\n"
            "నీటి ద్వారా సంక్రమించే వ్యాధులు (టైఫాయిడ్, కలరా, అతిసారం), ఇంట్లోనే ఓఆర్ఎస్ (ORS) ద్రావణం తయారీ, "
            "తాగునీటి శుద్ధీకరణ లేదా ప్రాథమిక ఆరోగ్య కేంద్రాన్ని (PHC) ఎప్పుడు సంప్రదించాలి అనే విషయాలపై మీరు నన్ను అడగవచ్చు.\n"
            "చెప్పండి, నేను మీకు ఎలా సహాయపడగలను?"
        ),
        'follow_ups': [
            {"type": "topic", "label": "టైఫాయిడ్ ముఖ్య లక్షణాలు", "value": "టైఫాయిడ్ ముఖ్య లక్షణాలు ఏమిటి?"},
            {"type": "topic", "label": "ఓఆర్ఎస్ ఎలా తయారు చేయాలి?", "value": "ఇంట్లోనే ఓఆర్ఎస్ ఎలా తయారు చేయాలి?"}
        ]
    },
    'ta': {
        'greeting': (
            "வணக்கம்! இனி நான் உங்களுடன் தமிழில் பேசுவேன். நான் உங்கள் அக்வாஷீல்ட் சுகாதார உதவியாளர்.\n\n"
            "நீரினால் பரவும் நோய்கள் (டைபாய்டு, காலரா, வயிற்றுப்போக்கு), வீட்டில் ஓ.ஆர்.எஸ் (ORS) தயாரிக்கும் முறை, "
            "பாதுகாப்பான குடிநீர் அல்லது ஆரம்ப சுகாதார நிலையத்தை (PHC) எப்போது அணுக வேண்டும் என்பது பற்றி நீங்கள் கேட்கலாம்.\n"
            "நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?"
        ),
        'follow_ups': [
            {"type": "topic", "label": "டைபாய்டு அறிகுறிகள்", "value": "டைபாய்டு காய்ச்சலின் முக்கிய அறிகுறிகள் என்ன?"},
            {"type": "topic", "label": "ஓ.ஆர்.எஸ் தயாரிப்பது எப்படி?", "value": "வீட்டில் ஓ.ஆர்.எஸ் தயாரிப்பது எப்படி?"}
        ]
    },
    'bn': {
        'greeting': (
            "নমস্কার! এখন থেকে আমি আপনার সাথে বাংলায় কথা বলব। আমি আপনার অ্যাকোয়াশিল্ড কমিউনিটি হেলথ অ্যাসিস্ট্যান্ট।\n\n"
            "আপনি আমাকে পানিবাহিত রোগ (যেমন টাইফয়েড, কলেরা, ডায়রিয়া), বাড়িতে ওআরএস (ORS) তৈরি, "
            "নিরাপদ পানীয় জল বা কখন স্বাস্থ্যকর্মীর পরামর্শ নেওয়া উচিত সে সম্পর্কে প্রশ্ন করতে পারেন।\n"
            "আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?"
        ),
        'follow_ups': [
            {"type": "topic", "label": "টাইফয়েডের প্রধান লক্ষণ", "value": "টাইফয়েডের প্রধান লক্ষণগুলি কী কী?"},
            {"type": "topic", "label": "ওআরএস তৈরির নিয়ম", "value": "বাড়িতে ওআরএস কীভাবে তৈরি করবেন?"}
        ]
    },
    'mr': {
        'greeting': (
            "नमस्कार! आता मी तुमच्याशी मराठीत बोलेन. मी तुमचा ॲक्वाशील्ड कम्युनिटी हेल्थ असिस्टंट आहे.\n\n"
            "तुम्ही मला जलजन्य आजार (जसे टायफॉइड, कॉलरा, जुलाब), ओआरएस (ORS) द्रावण बनवण्याची पद्धत, "
            "पिण्याचे पाणी शुद्ध करणे किंवा प्राथमिक आरोग्य केंद्राशी (PHC) संपर्क कधी साधावा याबद्दल प्रश्न विचारू शकता.\n"
            "आज मी तुम्हाला काय मदत करू शकेन?"
        ),
        'follow_ups': [
            {"type": "topic", "label": "टायफॉइडची मुख्य लक्षणे", "value": "टायफॉइडची मुख्य लक्षणे कोणती आहेत?"},
            {"type": "topic", "label": "ओआरएस कसे बनवावे?", "value": "घरी ओआरएस कसे बनवावे?"}
        ]
    },
    'gu': {
        'greeting': (
            "નમસ્તે! હવે હું તમારી સાથે ગુજરાતીમાં વાત કરીશ. હું તમારો એક્વાશીલ્ડ કોમ્યુનિટી હેલ્થ આસિસ્ટન્ટ છું.\n\n"
            "તમે મને પાણીજન્ય રોગો (ટાઇફોઇડ, કોલેરા, ઝાડા), ઘરે ઓઆરએસ (ORS) બનાવવાની રીત, "
            "પીવાના પાણીને શુદ્ધ કરવાની પદ્ધતિઓ અથવા આરોગ્ય કેન્દ્રનો ક્યારે સંપર્ક કરવો તે વિશે પૂછી શકો છો.\n"
            "હું તમારી શું મદદ કરી શકું?"
        ),
        'follow_ups': [
            {"type": "topic", "label": "ટાઇફોઇડના મુખ્ય લક્ષણો", "value": "ટાઇફોઇડના મુખ્ય લક્ષણો શું છે?"},
            {"type": "topic", "label": "ઓઆરએસ કેવી રીતે બનાવવું?", "value": "ઘરે ઓઆરએસ કેવી રીતે બનાવવું?"}
        ]
    },
    'kn': {
        'greeting': (
            "ನಮಸ್ಕಾರ! ಇನ್ನು ಮುಂದೆ ನಾನು ನಿಮ್ಮೊಂದಿಗೆ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ. ನಾನು ನಿಮ್ಮ ಆಕ್ವಾಶೀಲ್ಡ್ ಸಮುದಾಯ ಆರೋಗ್ಯ ಸಹಾಯಕ.\n\n"
            "ನೀರಿನಿಂದ ಹರಡುವ ರೋಗಗಳು (ಟೈಫಾಯ್ಡ್, ಕಾಲರಾ, ಅತಿಸಾರ), ಮನೆಯಲ್ಲೇ ಓಆರ್‌ಎಸ್ (ORS) ತಯಾರಿಕೆ ಮತ್ತು ಕುಡಿಯುವ ನೀರಿನ ಸುರಕ್ಷತೆಯ ಬಗ್ಗೆ ನೀವು ಕೇಳಬಹುದು.\n"
            "ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?"
        ),
        'follow_ups': [
            {"type": "topic", "label": "ಟೈಫಾಯ್ಡ್ ಲಕ್ಷಣಗಳು", "value": "ಟೈಫಾಯ್ಡ್‌ನ ಮುಖ್ಯ ಲಕ್ಷಣಗಳು ಯಾವುವು?"},
            {"type": "topic", "label": "ಓಆರ್‌ಎಸ್ ತಯಾರಿಸುವುದು ಹೇಗೆ?", "value": "ಮನೆಯಲ್ಲೇ ಓಆರ್‌ಎಸ್ ತಯಾರಿಸುವುದು ಹೇಗೆ?"}
        ]
    },
    'ml': {
        'greeting': (
            "നമസ്കാരം! ഇനി മുതൽ ഞാൻ നിങ്ങളോട് മലയാളത്തിൽ സംസാരിക്കും. ഞാൻ നിങ്ങളുടെ അക്വാഷੀൽഡ് കമ്മ്യൂണിറ്റി ഹെൽത്ത് അസിസ്റ്റന്റാണ്.\n\n"
            "ജലജന്യ രോഗങ്ങൾ (ടൈഫോയ്ഡ്, കോളറ, വയറിളക്കം), ഒആർഎസ് (ORS) നിർമ്മാണം, കുടിവെള്ള ശുദ്ധീകരണം എന്നിവയെക്കുറിച്ച് നിങ്ങൾക്ക് ചോദിക്കാം.\n"
            "ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കണം?"
        ),
        'follow_ups': [
            {"type": "topic", "label": "ടൈഫോയ്ഡ് ലക്ഷണങ്ങൾ", "value": "ടൈഫോയ്ഡിന്റെ പ്രധാന ലക്ഷണങ്ങൾ എന്തൊക്കെയാണ്?"},
            {"type": "topic", "label": "ഒആർഎസ് ഉണ്ടാക്കുന്നത് എങ്ങനെ?", "value": "വീട്ടിൽ ഒആർഎസ് ഉണ്ടാക്കുന്നത് എങ്ങനെ?"}
        ]
    },
    'pa': {
        'greeting': (
            "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਹੁਣ ਤੋਂ ਮੈਂ ਤੁਹਾਡੇ ਨਾਲ ਪੰਜਾਬੀ ਵਿੱਚ ਗੱਲ ਕਰਾਂਗਾ। ਮੈਂ ਤੁਹਾਡਾ ਐਕਵਾਸ਼ੀਲਡ ਕਮਿਊਨਿਟੀ ਹੈਲਥ ਅਸਿਸਟੈਂਟ ਹਾਂ।\n\n"
            "ਤੁਸੀਂ ਮੇਰੇ ਤੋਂ ਪਾਣੀ ਤੋਂ ਹੋਣ ਵਾਲੀਆਂ ਬਿਮਾਰੀਆਂ (ਜਿਵੇਂ ਟਾਈਫਾਈਡ, ਹੈਜ਼ਾ, ਦਸਤ), ਓ.ਆਰ.ਐਸ (ORS) ਬਣਾਉਣ ਦਾ ਤਰੀਕਾ, ਅਤੇ ਪੀਣ ਵਾਲੇ ਪਾਣੀ ਨੂੰ ਸਾਫ਼ ਕਰਨ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ।\n"
            "ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?"
        ),
        'follow_ups': [
            {"type": "topic", "label": "ਟਾਈਫਾਈਡ ਦੇ ਲੱਛਣ", "value": "ਟਾਈਫਾਈਡ ਦੇ ਮੁੱਖ ਲੱਛਣ ਕੀ ਹਨ?"},
            {"type": "topic", "label": "ਓ.ਆਰ.ਐਸ ਕਿਵੇਂ ਬਣਾਈਏ?", "value": "ਘਰ ਵਿੱਚ ਓ.ਆਰ.ਐਸ ਕਿਵੇਂ ਬਣਾਈਏ?"}
        ]
    },
    'fr': {
        'greeting': (
            "Bonjour ! Je vais désormais communiquer avec vous en français. Je suis votre assistant de santé communautaire AquaShield.\n\n"
            "Vous pouvez me poser des questions sur les maladies d'origine hydrique (typhoïde, choléra, diarrhée), la préparation des solutions de réhydratation orale (SRO), la purification de l'eau ou le moment de consulter un médecin.\n"
            "Comment puis-je vous aider aujourd'hui ?"
        ),
        'follow_ups': [
            {"type": "topic", "label": "Symptômes de la typhoïde", "value": "Quels sont les symptômes de la typhoïde ?"},
            {"type": "topic", "label": "Préparation de la SRO", "value": "Comment préparer une solution de réhydratation orale à la maison ?"}
        ]
    },
    'de': {
        'greeting': (
            "Hallo! Ich werde ab jetzt auf Deutsch mit Ihnen sprechen. Ich bin Ihr AquaShield Community-Gesundheitsassistent.\n\n"
            "Sie können mich zu wasserbedingten Krankheiten (Typhus, Cholera, Durchfall), der Zubereitung von Trinklösungen (ORS) und sauberem Trinkwasser befragen.\n"
            "Wie kann ich Ihnen heute helfen?"
        ),
        'follow_ups': [
            {"type": "topic", "label": "Symptome von Typhus", "value": "Was sind die Hauptsymptome von Typhus?"},
            {"type": "topic", "label": "ORS Zubereitung", "value": "Wie bereite ich eine Elektrolytlösung zu Hause zu?"}
        ]
    },
}

def generate_multilingual_fallback(intent: str, lang: str, user_message: str, has_warning: bool) -> str:
    """
    Fallback generator for regional and international languages.
    """
    code = str(lang).lower().strip()
    lang_info = LANGUAGE_CATALOG.get(code, {})
    lang_display = lang_info.get('name', str(lang).capitalize())
    native_name = lang_info.get('native', lang_display)

    if intent == "language_switch" and code in MULTILINGUAL_GREETINGS:
        data = MULTILINGUAL_GREETINGS[code]
        return f"{data['greeting']}\n---FOLLOW_UPS---\n{json.dumps(data['follow_ups'], ensure_ascii=False)}"

    if intent == "language_switch":
        return (
            f"Hello! I will now communicate with you in {lang_display} ({native_name}). "
            f"I am your AquaShield Community Health Assistant.\n\n"
            f"You can ask me about water-borne disease prevention, boiling water, preparing home ORS, "
            f"or when to consult your local Primary Health Centre (PHC).\n"
            f"How can I assist you today?"
            f"\n---FOLLOW_UPS---\n"
            f'[{{"type": "topic", "label": "Typhoid Symptoms & Prevention", "value": "What are the common symptoms of typhoid?"}}, '
            f'{{"type": "topic", "label": "How to prepare safe ORS?", "value": "How do I safely prepare ORS at home?"}}]'
        )

    # For other intents when Gemini API is offline:
    if has_warning or intent in ["warning_signs", "phc_consultation"]:
        return (
            f"**[AquaShield Health Advisory — {lang_display} ({native_name})]**\n\n"
            f"**EMERGENCY WARNING SIGNS:**\n"
            f"If the patient experiences blood in stool/vomit, inability to retain liquids, sunken eyes, "
            f"or continuous high fever for over 3 days, please take them immediately to the nearest Primary Health Centre (PHC) "
            f"or hospital, or contact your local ASHA/ANM health worker without delay.\n\n"
            f"Begin giving clean fluids and Oral Rehydration Salts (ORS) in small sips while arranging medical transport."
            f"\n---FOLLOW_UPS---\n"
            f'[{{"type": "topic", "label": "How to prepare safe ORS?", "value": "How do I safely prepare ORS at home?"}}, '
            f'{{"type": "topic", "label": "Safe Drinking Water Steps", "value": "How can I ensure my drinking water is safe?"}}]'
        )

    # General / ORS / Disease fallback with language acknowledgment
    return (
        f"**[AquaShield Community Health Assistant — {lang_display} ({native_name})]**\n\n"
        f"**Core Health Guidelines:**\n"
        f"1. **Safe Drinking Water:** Boil all drinking water vigorously for **at least 10 minutes** to eliminate harmful pathogens.\n"
        f"2. **Dehydration Protection (ORS):** Mix 1 packet of WHO-ORS in **1 litre of clean boiled water** (or 6 teaspoons sugar + 1/2 teaspoon salt in 1L water). Drink in small frequent sips.\n"
        f"3. **Hygiene:** Wash hands thoroughly with soap before food handling and after toilet use.\n"
        f"4. **Medical Care:** For persistent fever, severe loose motions, or weakness, consult your local ASHA worker or visit the nearest PHC."
        f"\n---FOLLOW_UPS---\n"
        f'[{{"type": "topic", "label": "How to prepare safe ORS?", "value": "How do I safely prepare ORS at home?"}}, '
        f'{{"type": "topic", "label": "Safe Drinking Water Steps", "value": "How can I ensure my drinking water is safe?"}}]'
    )

def generate_offline_fallback(intent: str, lang: str, user_message: str, has_warning: bool) -> str:
    """
    Generates rich, contextual, educational responses when Gemini API is unavailable.
    Supports Hindi, English, Indian regional languages, and global languages.
    """
    norm_lang = str(lang).lower().strip() if lang else 'en'

    # ─── Hindi Fallback ────────────────────────────────────────────────────────
    if norm_lang == 'hi':
        if intent == "language_switch":
            return (
                "नमस्ते! अब मैं आपसे हिंदी में बात करूंगा। मैं आपका एक्वाशील्ड कम्युनिटी हेल्थ असिस्टेंट हूँ।\n\n"
                "आप मुझसे जल जनित बीमारियों (जैसे टाइफाइड, हैजा, डायरिया), ओआरएस (ORS) घोल बनाने के तरीके, "
                "पीने के पानी को शुद्ध करने या स्वास्थ्य कार्यकर्ता से संपर्क करने से जुड़े सवाल पूछ सकते हैं।\n"
                "बताइए, आज मैं आपकी क्या सहायता कर सकता हूँ?"
                "\n---FOLLOW_UPS---\n"
                '[{"type": "topic", "label": "टाइफाइड के मुख्य लक्षण", "value": "टाइफाइड के मुख्य लक्षण क्या हैं?"}, '
                '{"type": "topic", "label": "ओआरएस (ORS) कैसे बनाएं?", "value": "घर पर ओआरएस कैसे बनाएं?"}]'
            )

        if intent == "ors_preparation":
            return (
                "**ओआरएस (ORS - Oral Rehydration Salts) तैयार करने की सही विधि:**\n\n"
                "**विधि 1: सरकारी/WHO ओआरएस पैकेट (सबसे उपयुक्त)**\n"
                "1. अपने हाथों को साबुन और साफ पानी से अच्छी तरह धोएं।\n"
                "2. एक साफ बर्तन में ठीक **1 लीटर साफ पीने का पानी** (उबालकर ठंडा किया हुआ) लें।\n"
                "3. ओआरएस का पूरा पैकेट उस पानी में डाल दें।\n"
                "4. चम्मच से तब तक घोलें जब तक पाउडर पूरी तरह घुल न जाए।\n"
                "5. इसमें अलग से कोई चीनी, नमक, दूध या जूस न मिलाएं।\n"
                "6. इस घोल को ढककर रखें और **24 घंटे के भीतर** ही इस्तेमाल करें। 24 घंटे बाद बचा हुआ घोल फेंक दें।\n\n"
                "**विधि 2: घरेलू चीनी-नमक का घोल (केवल आपातकाल में)**\n"
                "यदि पैकेट उपलब्ध न हो:\n"
                "- 1 लीटर साफ, उबला और ठंडा पानी\n"
                "- **6 छोटी चम्मच** चीनी\n"
                "- **आधा (1/2) छोटा चम्मच** नमक\n"
                "अच्छी तरह घोलें जब तक घुल न जाए।\n\n"
                "**सेवन का तरीका:** हर बार पतले दस्त के बाद छोटे-छोटे घूंट में पिएं। उल्टी हो तो 10 मिनट रुककर धीरे-धीरे दें।"
                "\n---FOLLOW_UPS---\n"
                '[{"type": "topic", "label": "पीने के पानी को शुद्ध करने के तरीके", "value": "पीने के पानी को सुरक्षित कैसे बनाएं?"}, '
                '{"type": "topic", "label": "डॉक्टर को कब दिखाएं?", "value": "प्राथमिक स्वास्थ्य केंद्र (PHC) कब जाना चाहिए?"}]'
            )

        if intent in ["disease_typhoid", "typhoid"]:
            return (
                "**टाइफाइड (मियादी बुखार) से संबंधित स्वास्थ्य जानकारी:**\n\n"
                "टाइफाइड *साल्मोनेला टाइफी* बैक्टीरिया के संक्रमण से होता है। यह मुख्य रूप से दूषित पानी या संक्रमित व्यक्ति के मल से दूषित हुए भोजन के जरिए फैलता है।\n\n"
                "**मुख्य लक्षण:**\n"
                "1. **तेज बुखार:** जो लगातार बना रहता है और धीरे-धीरे बढ़ता है (Step-ladder pattern)।\n"
                "2. **सिरदर्द और अत्यधिक कमजोरी:** शरीर में भारी थकान और बदन दर्द।\n"
                "3. **पेट की समस्याएं:** पेट दर्द, भूख न लगना, दस्त (लूज मोशन) या कुछ मरीजों में कब्ज।\n"
                "4. **जी मिचलाना या उल्टी होना।**\n\n"
                "**बचाव एवं सावधानी:**\n"
                "- पीने के पानी को हमेशा कम से कम 10 मिनट तक खौलता हुआ उबालकर ही पिएं।\n"
                "- शौच के बाद और खाना खाने से पहले साबुन से हाथ अच्छी तरह धोएं।\n"
                "- बाहर का खुला या बासा खाना न खाएं।\n\n"
                "**जरूरी सलाह:** टाइफाइड की पुष्टि केवल लैब टेस्ट (Widal या Blood Culture) द्वारा डॉक्टर ही कर सकते हैं। बिना डॉक्टर की सलाह के कोई एंटीबायोटिक न लें। तुरंत अपने नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) या आशा दीदी से संपर्क करें।"
                "\n---FOLLOW_UPS---\n"
                '[{"type": "topic", "label": "घर पर ओआरएस घोल कैसे बनाएं?", "value": "घर पर ओआरएस घोल कैसे बनाएं?"}, '
                '{"type": "topic", "label": "पानी को सुरक्षित कैसे रखें?", "value": "पीने के पानी को शुद्ध कैसे करें?"}]'
            )

        if intent in ["disease_cholera", "disease_diarrhea", "disease_dysentery"]:
            return (
                "**जल जनित दस्त एवं संक्रमण (हैजा/पेचिश/अतिसार) से संबंधित जानकारी:**\n\n"
                "दूषित पानी और अस्वच्छ भोजन से आंतों का संक्रमण हो सकता है, जिससे बार-बार पतले दस्त और उल्टी की समस्या होती है।\n\n"
                "**महत्वपूर्ण कदम:**\n"
                "1. **निर्जलीकरण (डिहाइड्रेशन) से बचाव:** सबसे पहले ओआरएस (ORS) घोल, नारियल पानी या दाल का पानी छोटी-छोटी घूंटों में लगातार दें।\n"
                "2. **सुरक्षित पानी:** केवल उबला हुआ और ढककर रखा हुआ पानी ही पिएं।\n"
                "3. **शौच स्वच्छता:** खुले में शौच न करें और साबुन से हाथ धोएं।\n\n"
                "**खतरे के संकेत (तुरंत अस्पताल जाएं):**\n"
                "- दस्त में खून आना\n"
                "- मरीज पानी न पी पा रहा हो या लगातार उल्टियां हो रही हों\n"
                "- आंखें अंदर धंसना, जीभ सूखना या 6 घंटे से पेशाब न होना\n"
                "- अत्यधिक कमजोरी या बेहोशी"
                "\n---FOLLOW_UPS---\n"
                '[{"type": "topic", "label": "ओआरएस बनाने की सही विधि", "value": "घर पर ओआरएस कैसे बनाएं?"}, '
                '{"type": "topic", "label": "प्राथमिक स्वास्थ्य केंद्र (PHC) कब जाएं?", "value": "अस्पताल या PHC कब जाना चाहिए?"}]'
            )

        if intent == "water_quality_and_contamination":
            return (
                "**पेयजल की गुणवत्ता और प्रदूषण से बचाव:**\n\n"
                "दूषित जल स्रोत ग्रामीण क्षेत्रों में जल जनित बीमारियों का मुख्य कारण हैं।\n\n"
                "**दूषित पानी के प्रमुख संकेत:**\n"
                "- पानी में मटमैलापन (टर्बिडिटी), पीलापन या तैरते हुए कण दिखना\n"
                "- पानी में सड़ी हुई गंध, रासायनिक महक या अजीब स्वाद आना\n"
                "- हैंडपंप या कुएं के 15 मीटर के दायरे में नाली, सेप्टिक टैंक या गोबर का ढेर होना\n\n"
                "**सुरक्षा मानक:**\n"
                "- सुरक्षित पीने के पानी का पीएच (pH) 6.5 से 8.5 के बीच होना चाहिए।\n"
                "- पानी में अवशिष्ट क्लोरीन 0.2 से 0.5 मिलीग्राम/लीटर होना आवश्यक है।\n\n"
                "**उपाय:** संदिग्ध स्रोत का पानी बिना उबाले न पिएं। दूषित हैंडपंप या कुएं की सूचना तुरंत ग्राम पंचायत या आशा दीदी को दें ताकि पानी की जांच हो सके।"
                "\n---FOLLOW_UPS---\n"
                '[{"type": "topic", "label": "पानी शुद्ध करने के घरेलू उपाय", "value": "पीने के पानी को शुद्ध कैसे करें?"}, '
                '{"type": "topic", "label": "टाइफाइड के लक्षण", "value": "टाइफाइड के मुख्य लक्षण क्या हैं?"}]'
            )

        if intent == "safe_drinking_water":
            return (
                "**पीने के पानी को शुद्ध और सुरक्षित बनाने के 4 नियम:**\n\n"
                "1. **पानी उबालना:** पानी को कम से कम **10 मिनट तक खौलता हुआ उबालें**। यह सभी बैक्टीरिया और वायरस को नष्ट करता है।\n"
                "2. **सुरक्षित भंडारण:** पानी को हमेशा साफ, ढके हुए बर्तन में रखें। नल वाले घड़े या संकरे मुंह वाले बर्तन का इस्तेमाल करें।\n"
                "3. **हाथ न डुबोएं:** पानी निकालने के लिए साफ डंडीदार लोटे का प्रयोग करें, कभी भी सीधे बर्तन में हाथ न डालें।\n"
                "4. **क्लोरीनेशन:** स्वास्थ्य विभाग द्वारा दी जाने वाली क्लोरीन की गोली का इस्तेमाल करें (1 गोली 20 लीटर साफ पानी में डालें और 30 मिनट बाद ही पानी पिएं)।"
                "\n---FOLLOW_UPS---\n"
                '[{"type": "topic", "label": "ओआरएस घोल बनाने की विधि", "value": "घर पर ओआरएस कैसे बनाएं?"}, '
                '{"type": "topic", "label": "दूषित पानी के नुकसान", "value": "दूषित पानी से कौन सी बीमारियां होती हैं?"}]'
            )

        if intent == "phc_consultation" or has_warning:
            return (
                "**प्राथमिक स्वास्थ्य केंद्र (PHC) या स्वास्थ्य कार्यकर्ता से कब संपर्क करें:**\n\n"
                "**तुरंत प्राथमिक स्वास्थ्य केंद्र (PHC) या अस्पताल जाएं यदि ये खतरे के लक्षण दिखें:**\n"
                "1. दस्त या उल्टी में खून आ रहा हो।\n"
                "2. मरीज कुछ भी खा-पी नहीं पा रहा हो या लगातार उल्टियां हो रही हों।\n"
                "3. गंभीर डिहाइड्रेशन: आंखें अंदर धंसना, मुंह पूरी तरह सूखना, 6 घंटे से पेशाब न होना।\n"
                "4. 3 दिन से अधिक समय तक लगातार तेज बुखार बना रहे।\n"
                "5. अत्यधिक सुस्ती, बेहोशी या चक्कर आना।\n\n"
                "**आशा (ASHA) / एएनएम (ANM) दीदी से संपर्क करें:**\n"
                "- शुरुआती दस्त में ओआरएस के पैकेट और बच्चों के लिए जिंक की गोलियां प्राप्त करने हेतु।\n"
                "- गांव में दूषित पेयजल स्रोत की रिपोर्ट करने हेतु।"
                "\n---FOLLOW_UPS---\n"
                '[{"type": "topic", "label": "ओआरएस घोल बनाने की विधि", "value": "घर पर ओआरएस कैसे बनाएं?"}, '
                '{"type": "topic", "label": "पानी को सुरक्षित कैसे बनाएं?", "value": "पीने के पानी को शुद्ध कैसे करें?"}]'
            )

        # Default Hindi fallback
        return (
            "नमस्ते! मैं आपका एक्वाशील्ड कम्युनिटी हेल्थ असिस्टेंट हूँ।\n\n"
            "मैं आपको जल जनित बीमारियों, सुरक्षित पेयजल, ओआरएस घोल बनाने के तरीकों और स्वास्थ्य सुरक्षा से जुड़ी शैक्षिक जानकारी दे सकता हूँ।\n"
            "यदि आपके परिवार में कोई बीमार है, तो कृपया अपने नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) या आशा कार्यकर्ता से सलाह लें।"
            "\n---FOLLOW_UPS---\n"
            '[{"type": "topic", "label": "टाइफाइड के मुख्य लक्षण", "value": "टाइफाइड के मुख्य लक्षण क्या हैं?"}, '
            '{"type": "topic", "label": "ओआरएस घोल कैसे बनाएं?", "value": "घर पर ओआरएस कैसे बनाएं?"}]'
        )

    # ─── Multilingual Regional / Global Fallback ──────────────────────────────
    if norm_lang != 'en':
        return generate_multilingual_fallback(intent, norm_lang, user_message, has_warning)

    # ─── English Fallback ─────────────────────────────────────────────────────
    if intent == "language_switch":
        return (
            "Hello! I will communicate with you in English. I am your AquaShield Community Health Assistant.\n\n"
            "You can ask me about water-borne diseases (Typhoid, Cholera, Dysentery, Hepatitis), preparing ORS at home, "
            "safe drinking water steps, or when to consult your local health worker. How can I help you today?"
            "\n---FOLLOW_UPS---\n"
            '[{"type": "topic", "label": "Typhoid Symptoms & Prevention", "value": "What are the common symptoms of typhoid?"}, '
            '{"type": "topic", "label": "How to prepare safe ORS?", "value": "How do I safely prepare ORS at home?"}]'
        )

    if intent == "ors_preparation":
        return (
            "**Oral Rehydration Salts (ORS) Preparation Guide:**\n\n"
            "**Method 1: WHO/Government Packaged ORS (Recommended)**\n"
            "1. Wash hands thoroughly with soap and safe water.\n"
            "2. In a clean container, measure exactly **1 litre of clean drinking water** (boiled and cooled).\n"
            "3. Empty the entire packet of ORS into the water.\n"
            "4. Stir well with a clean spoon until the powder is fully dissolved.\n"
            "5. Do NOT add extra sugar, salt, milk, or juice.\n"
            "6. Keep covered and consume within **24 hours**. Discard any remaining solution after 24 hours.\n\n"
            "**Method 2: Home-Made Sugar-Salt Solution (Emergency Only)**\n"
            "If packaged ORS is unavailable:\n"
            "- 1 litre of clean, boiled and cooled drinking water\n"
            "- **6 level teaspoons** of sugar\n"
            "- **1/2 level teaspoon** of salt\n"
            "Stir until fully dissolved. The taste should be no saltier than tears.\n\n"
            "**How to Drink:** Take small, frequent sips after each loose stool. If vomiting occurs, wait 10 minutes and continue slowly."
            "\n---FOLLOW_UPS---\n"
            '[{"type": "topic", "label": "Safe Drinking Water Steps", "value": "How can I ensure my drinking water is safe?"}, '
            '{"type": "topic", "label": "When to visit a PHC?", "value": "When should I go to a PHC or hospital immediately?"}]'
        )

    if intent in ["disease_typhoid", "typhoid"]:
        return (
            "**Typhoid Fever Educational Information:**\n\n"
            "Typhoid is a bacterial infection caused by *Salmonella Typhi*. It spreads primarily through drinking water or food contaminated with feces from an infected person or carrier.\n\n"
            "**Common Symptoms:**\n"
            "1. **Prolonged High Fever:** Often rises gradually in a step-ladder pattern.\n"
            "2. **Severe Headache & Weakness:** General body aches, fatigue, and lethargy.\n"
            "3. **Gastrointestinal Symptoms:** Stomach pain, loss of appetite, loose stool (diarrhea) or constipation.\n"
            "4. **Nausea and occasionally a dry cough or rash.**\n\n"
            "**Key Prevention Measures:**\n"
            "- Boil all drinking water vigorously for **at least 10 minutes** before drinking.\n"
            "- Wash hands thoroughly with soap before meals and after using the toilet.\n"
            "- Avoid uncovered street food, unwashed raw produce, or ice made from untreated water.\n\n"
            "**Medical Guidance:** Typhoid cannot be diagnosed on symptoms alone; it requires clinical tests (blood culture or Widal test) and prescribed antibiotics from a qualified clinician. Please visit your nearest Primary Health Centre (PHC) or consult an ASHA/ANM health worker."
            "\n---FOLLOW_UPS---\n"
            '[{"type": "topic", "label": "How to prepare safe ORS?", "value": "How do I safely prepare ORS at home?"}, '
            '{"type": "topic", "label": "Safe Drinking Water Steps", "value": "How can I ensure my drinking water is safe?"}]'
        )

    if intent in ["disease_cholera", "disease_diarrhea", "disease_dysentery"]:
        return (
            "**Waterborne Diarrheal Illness & Infection Guidance:**\n\n"
            "Contaminated water can cause acute intestinal infections resulting in rapid fluid loss through loose stools and vomiting.\n\n"
            "**Immediate Steps:**\n"
            "1. **Hydration First:** Begin giving Oral Rehydration Salts (ORS) solution immediately in small, frequent sips.\n"
            "2. **Safe Water:** Drink only boiled and safely stored water.\n"
            "3. **Sanitation:** Use dedicated toilets and wash hands with soap frequently.\n\n"
            "**Red Flag Emergency Signs (Seek Immediate Medical Care):**\n"
            "- Blood in stool or vomit\n"
            "- Inability to drink liquids or keep fluids down\n"
            "- Signs of severe dehydration (sunken eyes, dry mouth, no urine for >6 hours)\n"
            "- Extreme weakness, confusion, or high persistent fever"
            "\n---FOLLOW_UPS---\n"
            '[{"type": "topic", "label": "How to prepare safe ORS?", "value": "How do I safely prepare ORS at home?"}, '
            '{"type": "topic", "label": "When to visit a PHC?", "value": "When should I go to a PHC or hospital immediately?"}]'
        )

    if intent == "water_quality_and_contamination":
        return (
            "**Drinking Water Quality & Contamination Awareness:**\n\n"
            "Contaminated water is the primary cause of outbreaks such as Cholera, Typhoid, and Hepatitis A/E.\n\n"
            "**Signs of Water Contamination:**\n"
            "- Cloudiness (turbidity), discoloration, or visible floating particles.\n"
            "- Foul, sulfur, metallic, or unusual chemical odor.\n"
            "- Handpumps or open wells located within 15 meters of open sewers, animal waste, or pit latrines.\n\n"
            "**Standard Safety Benchmarks:**\n"
            "- Safe drinking water pH: 6.5 to 8.5.\n"
            "- Desired turbidity: < 1 NTU.\n"
            "- Free residual chlorine: 0.2 to 0.5 mg/L.\n\n"
            "**Action:** Boil all suspect water vigorously before consumption. Report contaminated sources to your Gram Panchayat or village health worker for official water testing."
            "\n---FOLLOW_UPS---\n"
            '[{"type": "topic", "label": "Safe Drinking Water Steps", "value": "How can I ensure my drinking water is safe?"}, '
            '{"type": "topic", "label": "Typhoid Symptoms & Prevention", "value": "What are the common symptoms of typhoid?"}]'
        )

    if intent == "safe_drinking_water":
        return (
            "**4 Core Rules for Safe Drinking Water:**\n\n"
            "1. **Boiling:** Boil drinking water in a rolling boil for **at least 10 minutes**. This kills all harmful bacteria, viruses, and parasites.\n"
            "2. **Safe Storage:** Store treated water in a clean, covered container fitted with a tap or narrow neck. Never dip dirty hands into the vessel.\n"
            "3. **Clean Handling:** Use a clean ladle with a long handle if dipping is required.\n"
            "4. **Chlorination:** Use chlorine tablets (1 tablet per 20 litres of clear water; wait 30 minutes before drinking)."
            "\n---FOLLOW_UPS---\n"
            '[{"type": "topic", "label": "How to prepare safe ORS?", "value": "How do I safely prepare ORS at home?"}, '
            '{"type": "topic", "label": "Water Quality Testing", "value": "How do I know if my water is contaminated?"}]'
        )

    if intent == "phc_consultation" or has_warning:
        return (
            "**When to Visit a Primary Health Centre (PHC) or Consult an ASHA Worker:**\n\n"
            "**Seek EMERGENCY medical care at a PHC or Hospital if you notice:**\n"
            "1. Blood in stool or vomit.\n"
            "2. Patient cannot drink or keep fluids down due to persistent vomiting.\n"
            "3. Severe dehydration: sunken eyes, dry mouth, extreme thirst, no urine for >6 hours.\n"
            "4. Continuous high fever lasting more than 3 days.\n"
            "5. Extreme lethargy, drowsiness, or confusion.\n\n"
            "**Consult your local ASHA or ANM worker for:**\n"
            "- Packaged ORS sachets and zinc supplements for children.\n"
            "- Early advice on mild symptoms.\n"
            "- Reporting contaminated community drinking water sources."
            "\n---FOLLOW_UPS---\n"
            '[{"type": "topic", "label": "How to prepare safe ORS?", "value": "How do I safely prepare ORS at home?"}, '
            '{"type": "topic", "label": "Safe Drinking Water Steps", "value": "How can I ensure my drinking water is safe?"}]'
        )

    # Default English fallback
    return (
        "Hello! I am your AquaShield Community Health Assistant.\n\n"
        "I can provide educational guidance on water-borne diseases, safe drinking water, household hygiene, and when to consult a health worker.\n"
        "If you or someone in your village is feeling unwell, please consult your local ASHA/ANM worker or visit the nearest Primary Health Centre (PHC)."
        "\n---FOLLOW_UPS---\n"
        '[{"type": "topic", "label": "Typhoid Symptoms & Prevention", "value": "What are the common symptoms of typhoid?"}, '
        '{"type": "topic", "label": "How to prepare safe ORS?", "value": "How do I safely prepare ORS at home?"}]'
    )


# ─── Main Chat Processing Pipeline ───────────────────────────────────────────

def process_message(user_message: str, history: list, user_pref: str = None) -> dict:
    """
    Main processing pipeline:
    1. Language determination & persistence
    2. Intent detection & knowledge base grounding
    3. Gemini API response with language & timeout enforcement
    4. Context-aware bilingual fallback on API unavailability
    5. Safety validation & follow-up formatting
    """
    kb = KnowledgeBase()

    # 1. Determine Language
    lang = determine_language(user_message, history, user_pref)

    # 2. Detect Intent and Extract Context
    intent, context = detect_intent_and_context(user_message, kb, lang)

    # 3. Check for Warning Signs
    has_warning = kb.detect_warning_signs(user_message)
    if has_warning:
        intent = "warning_signs"
        context += "\nURGENT: User reported severe warning signs. Emphasize immediate medical evaluation."

    # 4. Format History for Gemini
    gemini_history = []
    for msg in history[-10:]:
        gemini_history.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
    gemini_history.append({"role": "user", "content": user_message})

    # 5. Execute Gemini API Call with Fallback
    try:
        gemini_text = generate_chat_response(gemini_history, SYSTEM_INSTRUCTION, context, lang)
    except Exception as e:
        logger.warning("Gemini API unavailable (%s). Using local knowledge base fallback.", type(e).__name__)
        gemini_text = generate_offline_fallback(intent, lang, user_message, has_warning)

    # 6. Post-processing Safety Validation
    unsafe_phrases = ["you have cholera", "you have typhoid", "this confirms you have", "take antibiotics", "take ciprofloxacin"]
    text_lower = gemini_text.lower()
    if any(phrase in text_lower for phrase in unsafe_phrases):
        if lang == 'hi':
            gemini_text = (
                "यह लक्षण कई स्वास्थ्य स्थितियों में हो सकते हैं। केवल लक्षणों के आधार पर बीमारी की पुष्टि नहीं की जा सकती। "
                "कृपया सही जांच और उपचार के लिए अपने नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) या योग्य डॉक्टर से संपर्क करें।"
            )
        else:
            gemini_text = (
                "These symptoms can occur with several conditions. Symptoms alone cannot confirm a diagnosis. "
                "Please consult a qualified healthcare professional or visit your nearest PHC for a proper clinical evaluation."
            )

    # 7. Extract Follow-Up Questions Cleanly
    follow_up_questions = []
    if "---FOLLOW_UPS---" in gemini_text:
        parts = gemini_text.split("---FOLLOW_UPS---", 1)
        gemini_text = parts[0].strip()
        follow_up_raw = parts[1].strip()

        # Strip markdown code fences if wrapped
        if follow_up_raw.startswith("```json"):
            follow_up_raw = follow_up_raw[7:]
        if follow_up_raw.startswith("```"):
            follow_up_raw = follow_up_raw[3:]
        if follow_up_raw.endswith("```"):
            follow_up_raw = follow_up_raw[:-3]

        try:
            parsed = json.loads(follow_up_raw.strip())
            if isinstance(parsed, list):
                follow_up_questions = parsed[:3]
        except Exception as json_err:
            logger.debug("Follow-up JSON parsing note: %s", json_err)

    return {
        "response": gemini_text,
        "intent": intent,
        "warning": has_warning,
        "language": lang,
        "follow_up_questions": follow_up_questions[:3]
    }
