import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
from django.conf import settings

def get_gemini_client():
    load_dotenv(os.path.join(settings.BASE_DIR, '.env'))
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set.")
    return genai.Client(api_key=api_key)

def generate_chat_response(messages, system_instruction, context=""):
    """
    Calls Gemini API with the given messages and system instruction.
    """
    client = get_gemini_client()
    
    # We use gemini-3.6-flash for fast and cost-effective chatbot interactions
    model_name = "gemini-3.6-flash"
    
    # Prepend context to the last user message if context is provided
    formatted_messages = []
    for msg in messages:
        role = "user" if msg['role'] == 'user' else "model"
        formatted_messages.append({"role": role, "parts": [{"text": msg['content']}]})
        
    if context and formatted_messages:
        last_msg = formatted_messages[-1]
        if last_msg["role"] == "user":
            last_msg["parts"][0]["text"] = f"Context from knowledge base:\n{context}\n\nUser Message: {last_msg['parts'][0]['text']}"

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.2, # Keep it deterministic and safe
    )

    response = client.models.generate_content(
        model=model_name,
        contents=formatted_messages,
        config=config
    )
    
    return response.text
