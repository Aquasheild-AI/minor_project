import json
import os
from django.conf import settings

# Determine path to diseases.json
# Assuming backend/chatbot/knowledge/diseases.json
BASE_DIR = settings.BASE_DIR
KNOWLEDGE_PATH = os.path.join(BASE_DIR, 'chatbot', 'knowledge', 'diseases.json')

class KnowledgeBase:
    _instance = None
    _data = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(KnowledgeBase, cls).__new__(cls)
            cls._instance._load_data()
        return cls._instance

    def _load_data(self):
        try:
            with open(KNOWLEDGE_PATH, 'r', encoding='utf-8') as f:
                self._data = json.load(f)
        except Exception as e:
            print(f"Error loading diseases.json: {e}")
            self._data = {"conditions": [], "symptom_matching_rules": {"rules": []}, "global_safety_rules": []}

    def get_all_conditions(self):
        return self._data.get('conditions', [])

    def get_condition_by_name(self, name):
        name_lower = name.lower()
        for condition in self.get_all_conditions():
            if name_lower in condition['name'].lower() or name_lower == condition['id'].lower():
                return condition
        return None

    def find_matching_conditions(self, user_symptoms_text):
        """
        Simple keyword-based matching for symptoms using the symptom_matching_rules.
        Returns a list of possible conditions and notes.
        """
        user_text = user_symptoms_text.lower()
        matches = []
        rules = self._data.get('symptom_matching_rules', {}).get('rules', [])
        
        for rule in rules:
            symptoms = rule.get('symptoms', [])
            # If all symptoms in the rule are mentioned in the text
            # This is a very basic heuristic.
            if all(sym in user_text for sym in symptoms):
                matches.append({
                    "possible_conditions": rule.get('possible_conditions', []),
                    "note": rule.get('note', '')
                })
        
        return matches

    def get_global_safety_rules(self):
        return self._data.get('global_safety_rules', [])

    def detect_warning_signs(self, user_text):
        """
        Checks if user text contains any urgent warning signs from any condition.
        """
        user_text = user_text.lower()
        for condition in self.get_all_conditions():
            for sign in condition.get('urgent_warning_signs', []):
                if sign.lower() in user_text:
                    return True
        return False
