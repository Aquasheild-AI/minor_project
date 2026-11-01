import json
import os
import re
from django.conf import settings

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
            # Safe minimal fallback structure
            self._data = {
                "conditions": [],
                "symptom_matching_rules": {"rules": []},
                "global_safety_rules": [],
                "ors_guidance": {},
                "water_quality_guidance": {}
            }

    def get_all_conditions(self):
        return self._data.get('conditions', [])

    def get_condition_by_name(self, name):
        if not name:
            return None
        name_lower = name.lower().strip()
        for condition in self.get_all_conditions():
            if name_lower in condition.get('name', '').lower() or name_lower == condition.get('id', '').lower():
                return condition
            # Check aliases
            for alias in condition.get('aliases', []):
                if name_lower in alias.lower():
                    return condition
        return None

    def find_condition_by_query(self, query):
        if not query:
            return None
        q_lower = query.lower()
        for condition in self.get_all_conditions():
            cid = condition.get('id', '').lower()
            cname = condition.get('name', '').lower()
            chindi = condition.get('hindi_name', '').lower()
            if cid in q_lower or cname in q_lower or chindi in q_lower:
                return condition
            for alias in condition.get('aliases', []):
                if alias.lower() in q_lower:
                    return condition
        return None

    def find_matching_conditions(self, user_symptoms_text):
        """
        Keyword-based matching for symptoms using symptom_matching_rules.
        """
        user_text = user_symptoms_text.lower()
        matches = []
        rules = self._data.get('symptom_matching_rules', {}).get('rules', [])
        
        for rule in rules:
            symptoms = rule.get('symptoms', [])
            if any(sym in user_text for sym in symptoms):
                matches.append({
                    "possible_conditions": rule.get('possible_conditions', []),
                    "note": rule.get('note', '')
                })
        
        return matches

    def get_global_safety_rules(self):
        return self._data.get('global_safety_rules', [])

    def get_ors_guidelines(self, lang='en'):
        ors = self._data.get('ors_guidance', {})
        if lang == 'hi':
            return ors.get('hi', {})
        return ors.get('en', {})

    def get_water_quality_guidelines(self):
        return self._data.get('water_quality_guidance', {})

    def detect_warning_signs(self, user_text):
        """
        Checks if user text contains urgent warning signs (English or Hindi).
        """
        if not user_text:
            return False
        user_text_lower = user_text.lower()

        # Direct red flags
        emergency_keywords = [
            'blood in stool', 'bloody stool', 'severe dehydration', 'unconscious',
            'cannot drink', 'unable to drink', 'sunken eyes', 'no urine',
            'high fever for 4 days', 'high fever for 5 days', 'persistent vomiting',
            'खून', 'मल में खून', 'बेहोश', 'अत्यधिक कमजोरी', 'पानी न पी पाना',
            'आंखें धंसना', 'पेशाब बंद', 'लगातार उल्टी', 'सुस्ती'
        ]
        if any(kw in user_text_lower for kw in emergency_keywords):
            return True

        for condition in self.get_all_conditions():
            for sign in condition.get('urgent_warning_signs', []):
                if sign.lower() in user_text_lower:
                    return True
            for sign in condition.get('hindi_warning_signs', []):
                if sign.lower() in user_text_lower:
                    return True

        return False
