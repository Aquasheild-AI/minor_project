import json
from .knowledge_base import KnowledgeBase
from .gemini_service import generate_chat_response

# System instruction for Gemini
SYSTEM_INSTRUCTION = """
You are the "AquaShield AI Community Health Assistant", a friendly and helpful AI chatbot for rural community users.
Your scope covers water-borne disease education, symptoms, prevention, sanitation, safe water, and community health awareness.

CRITICAL RULES:
1. You are NOT a doctor and cannot diagnose diseases.
2. NEVER say "You have [disease]", "Your symptoms confirm [disease]", or "You definitely have [disease]".
3. Use phrases like "These symptoms can occur with several conditions, including..." or "These symptoms may be associated with...".
4. NEVER prescribe medication, give medication dosages, or tell the user to stop prescribed medication.
5. If you recognize emergency warning signs, politely urge the user to seek immediate professional medical evaluation.
6. Use simple, easily understandable language suitable for rural/community users. Avoid unnecessary medical jargon.
7. Be concise but helpful.
8. If the user asks about something unrelated to water, health, or sanitation, politely explain your scope. Do not answer off-topic questions.
9. ONLY use the information provided in the Context to answer factual questions about diseases. If information is not provided and you don't know safely, say so.
10. ALWAYS include a recommendation to consult a healthcare professional for proper evaluation when discussing symptoms.
11. Do NOT use overly definitive or alarmist wording like "your body is at a high risk of severe dehydration". Use softer educational phrasing like "Vomiting and watery diarrhea can cause dehydration, especially when they continue for multiple days."
12. IMPORTANT FORMATTING: Do NOT include follow-up questions or choices in your main response text. Instead, provide exactly 2 or 3 follow-up options at the very end of your output, separated by the exact string `---FOLLOW_UPS---`. The options MUST be in a valid JSON array format.
There are two types of follow-ups:
- "topic": Suggest related questions the user could ask you to learn more.
- "choice": Provide possible answers to a question YOU just asked the user.

Example for a topic:
Your main response here...
---FOLLOW_UPS---
[
  {"type": "topic", "label": "How can I make water safe for drinking?", "value": "How can I make water safe for drinking?"},
  {"type": "topic", "label": "What are the symptoms of cholera?", "value": "What are the symptoms of cholera?"}
]

Example for a choice (if your response ends with "How long have you been vomiting?"):
Your main response here...
---FOLLOW_UPS---
[
  {"type": "choice", "label": "Less than 1 day", "value": "I have been vomiting for less than 1 day."},
  {"type": "choice", "label": "1-2 days", "value": "I have been vomiting for 1-2 days."}
]
"""

def detect_intent_and_context(user_message, kb):
    """
    Very basic heuristic intent detection and context extraction.
    In a real-world scenario, this could also use an LLM or NLP library.
    """
    msg_lower = user_message.lower()
    
    # 1. Disease Information
    for condition in kb.get_all_conditions():
        if condition['name'].lower() in msg_lower or condition['id'].lower() in msg_lower:
            return "disease_information", json.dumps(condition)
            
    # 2. Prevention
    if any(word in msg_lower for word in ['prevent', 'safe', 'clean', 'protect', 'avoid']):
        # gather prevention info
        prevention_context = {"general": "Wash hands, drink safe water, maintain hygiene."}
        for condition in kb.get_all_conditions():
            if condition['name'].lower() in msg_lower:
                prevention_context[condition['name']] = condition.get('prevention', [])
        return "prevention", json.dumps(prevention_context)

    # 3. Symptom Guidance
    symptom_keywords = ['pain', 'fever', 'diarrhea', 'vomit', 'sick', 'stool', 'blood', 'weak', 'dizzy', 'nausea']
    if any(word in msg_lower for word in symptom_keywords):
        matches = kb.find_matching_conditions(user_message)
        context = {"matched_rules": matches, "safety_rules": kb.get_global_safety_rules()}
        return "symptom_guidance", json.dumps(context)
        
    # 4. Symptom Reporting
    if any(word in msg_lower for word in ['report', 'record', 'submit']):
        return "symptom_reporting", "User wants to report symptoms to the system."
        
    return "general_or_unknown", ""

def process_message(user_message, history):
    kb = KnowledgeBase()
    
    # 1. Detect Intent and Extract Context
    intent, context = detect_intent_and_context(user_message, kb)
    
    # 2. Check for Warning Signs
    has_warning = kb.detect_warning_signs(user_message)
    if has_warning:
        intent = "warning_signs"
        context += " \nWARNING: User reported severe warning signs. Emphasize immediate medical attention."
    
    # 3. Format History for Gemini
    gemini_history = []
    for msg in history[-10:]: # keep last 10 messages for context window
        gemini_history.append({"role": msg['role'], "content": msg['content']})
        
    # Append current message
    gemini_history.append({"role": "user", "content": user_message})
    
    # 4. Get Gemini Response
    try:
        gemini_text = generate_chat_response(gemini_history, SYSTEM_INSTRUCTION, context)
    except Exception as e:
        print(f"Gemini API error: {e}")
        gemini_text = "I'm having trouble connecting to the AI assistant right now. Please try again."

    # 5. Safety Validation (Post-processing)
    unsafe_phrases = ["you have cholera", "you have typhoid", "this confirms", "you definitely have", "take antibiotics"]
    gemini_text_lower = gemini_text.lower()
    
    is_unsafe = any(phrase in gemini_text_lower for phrase in unsafe_phrases)
    if is_unsafe:
        gemini_text = "These symptoms can occur with several conditions. Symptoms alone cannot confirm a diagnosis. Please consult a healthcare professional for proper evaluation."

    # Extract follow-up questions cleanly using JSON structure
    follow_up_questions = []
    if "---FOLLOW_UPS---" in gemini_text:
        parts = gemini_text.split("---FOLLOW_UPS---", 1)
        gemini_text = parts[0].strip()
        follow_up_section = parts[1].strip()
        
        # Clean markdown wrappers if present
        if follow_up_section.startswith("```json"):
            follow_up_section = follow_up_section[7:]
        if follow_up_section.startswith("```"):
            follow_up_section = follow_up_section[3:]
        if follow_up_section.endswith("```"):
            follow_up_section = follow_up_section[:-3]
            
        try:
            parsed = json.loads(follow_up_section.strip())
            if isinstance(parsed, list):
                follow_up_questions = parsed
        except Exception as e:
            print(f"JSON parsing error for follow_ups: {e}")

    return {
        "response": gemini_text,
        "intent": intent,
        "warning": has_warning,
        "follow_up_questions": follow_up_questions[:3] # Limit to 3
    }
