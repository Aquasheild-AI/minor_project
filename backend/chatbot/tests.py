from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from chatbot.models import ChatConversation, ChatMessage
from chatbot.services.chatbot_service import (
    process_message,
    determine_language,
    detect_intent_and_context,
    generate_offline_fallback,
)
from chatbot.services.knowledge_base import KnowledgeBase

User = get_user_model()

class ChatbotServiceUnitTests(TestCase):
    def setUp(self):
        self.kb = KnowledgeBase()

    def test_language_detection_devanagari(self):
        lang = determine_language("टाइफाइड के मुख्य लक्षण क्या हैं?", [])
        self.assertEqual(lang, 'hi')

    def test_language_detection_explicit_hindi(self):
        lang = determine_language("हिंदी में बात करो", [])
        self.assertEqual(lang, 'hi')
        lang2 = determine_language("talk in hindi please", [])
        self.assertEqual(lang2, 'hi')

    def test_language_persistence_across_turns(self):
        history = [
            {"role": "user", "content": "हिंदी में बात करो"},
            {"role": "model", "content": "नमस्ते! मैं आपकी क्या सहायता कर सकता हूँ?"}
        ]
        # User follows up with a Romanized/ambiguous message
        lang = determine_language("ors kaise banaye", history)
        self.assertEqual(lang, 'hi')

        # User explicitly switches back to English
        lang_en = determine_language("Please talk in English now", history)
        self.assertEqual(lang_en, 'en')

    def test_ors_intent_detection_english(self):
        intent, context = detect_intent_and_context("How do I safely prepare ORS at home?", self.kb, 'en')
        self.assertEqual(intent, "ors_preparation")

    def test_ors_intent_detection_hindi(self):
        intent, context = detect_intent_and_context("घर पर ओआरएस घोल कैसे बनाएं?", self.kb, 'hi')
        self.assertEqual(intent, "ors_preparation")

    def test_typhoid_intent_detection_hindi(self):
        intent, context = detect_intent_and_context("टाइफाइड के मुख्य लक्षण क्या हैं?", self.kb, 'hi')
        self.assertEqual(intent, "disease_typhoid")

    def test_water_quality_intent_detection(self):
        intent, context = detect_intent_and_context("How do I know if my handpump water is contaminated?", self.kb, 'en')
        self.assertEqual(intent, "water_quality_and_contamination")

    def test_safe_drinking_water_intent_detection(self):
        intent, context = detect_intent_and_context("How long should I boil water to make it safe?", self.kb, 'en')
        self.assertEqual(intent, "safe_drinking_water")

    def test_phc_consultation_intent_detection(self):
        intent, context = detect_intent_and_context("When should I visit a Primary Health Centre or see an ASHA worker?", self.kb, 'en')
        self.assertEqual(intent, "phc_consultation")

    def test_warning_signs_detection(self):
        has_warning = self.kb.detect_warning_signs("The patient has blood in stool and cannot drink water")
        self.assertTrue(has_warning)

        has_warning_hi = self.kb.detect_warning_signs("मरीज के मल में खून आ रहा है और वह बेहोश है")
        self.assertTrue(has_warning_hi)

    def test_offline_fallback_ors_english(self):
        response = generate_offline_fallback("ors_preparation", "en", "How to make ORS?", False)
        self.assertIn("1 litre", response)
        self.assertIn("6 level teaspoons", response)
        self.assertIn("sugar", response)
        self.assertIn("1/2 level teaspoon", response)
        self.assertIn("salt", response)
        self.assertIn("---FOLLOW_UPS---", response)

    def test_offline_fallback_ors_hindi(self):
        response = generate_offline_fallback("ors_preparation", "hi", "ओआरएस कैसे बनाएं?", False)
        self.assertIn("1 लीटर साफ पीने का पानी", response)
        self.assertIn("6 छोटी चम्मच", response)
        self.assertIn("---FOLLOW_UPS---", response)

    def test_offline_fallback_typhoid_hindi(self):
        response = generate_offline_fallback("disease_typhoid", "hi", "टाइफाइड के लक्षण", False)
        self.assertIn("टाइफाइड", response)
        self.assertIn("तेज बुखार", response)
        self.assertIn("प्राथमिक स्वास्थ्य केंद्र", response)

    def test_offline_fallback_water_quality(self):
        response = generate_offline_fallback("water_quality_and_contamination", "en", "Water smells bad", False)
        self.assertIn("Contamination", response)
        self.assertIn("turbidity", response.lower())

    @patch('chatbot.services.chatbot_service.generate_chat_response')
    def test_gemini_failure_triggers_context_aware_fallback(self, mock_gemini):
        mock_gemini.side_effect = RuntimeError("Gemini connection timed out")
        
        result = process_message("How do I safely prepare ORS at home?", [])
        self.assertEqual(result["intent"], "ors_preparation")
        self.assertEqual(result["language"], "en")
        self.assertIn("sugar", result["response"].lower())
        self.assertIn("salt", result["response"].lower())
        self.assertTrue(len(result["follow_up_questions"]) > 0)


class ChatbotAPIE2ETests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.community_user = User.objects.create_user(
            username='comm_user_test',
            email='comm_test@example.com',
            password='Password@123',
            role='COMMUNITY'
        )
        self.worker_user = User.objects.create_user(
            username='worker_user_test',
            email='worker_test@example.com',
            password='Password@123',
            role='HEALTH_WORKER'
        )

    def test_unauthenticated_request_rejected(self):
        res = self.client.post('/api/chatbot/chat/', {'message': 'Hello'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_community_role_forbidden(self):
        self.client.force_authenticate(user=self.worker_user)
        res = self.client.post('/api/chatbot/chat/', {'message': 'Hello'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    @patch('chatbot.services.chatbot_service.generate_chat_response')
    def test_community_user_successful_chat(self, mock_gemini):
        mock_gemini.return_value = (
            "Boiling water for at least 10 minutes kills harmful pathogens.\n"
            "---FOLLOW_UPS---\n"
            '[{"type": "topic", "label": "How to store safely?", "value": "How should I store boiled water?"}]'
        )
        self.client.force_authenticate(user=self.community_user)
        res = self.client.post('/api/chatbot/chat/', {'message': 'How to clean drinking water?'}, format='json')
        
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("response", res.data)
        self.assertIn("conversation_id", res.data)
        self.assertTrue(len(res.data["follow_up_questions"]) > 0)

        # Check conversation and messages were saved in DB
        conv = ChatConversation.objects.get(id=res.data["conversation_id"])
        self.assertEqual(conv.messages.count(), 2)

    @patch('chatbot.services.chatbot_service.generate_chat_response')
    def test_hindi_turn_conversation_persistence(self, mock_gemini):
        # First turn: Ask to speak in Hindi
        mock_gemini.return_value = (
            "नमस्ते! अब मैं आपसे हिंदी में बात करूंगा।\n"
            "---FOLLOW_UPS---\n"
            '[{"type": "topic", "label": "टाइफाइड के लक्षण", "value": "टाइफाइड के लक्षण क्या हैं?"}]'
        )
        self.client.force_authenticate(user=self.community_user)
        res1 = self.client.post('/api/chatbot/chat/', {'message': 'हिंदी में बात करो'}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        conv_id = res1.data["conversation_id"]

        # Second turn: Send follow-up in same conversation
        mock_gemini.return_value = (
            "ओआरएस का घोल शरीर में पानी और नमक की कमी को पूरा करता है।\n"
            "---FOLLOW_UPS---\n"
            '[{"type": "topic", "label": "ओआरएस बनाने की विधि", "value": "ओआरएस कैसे बनाएं?"}]'
        )
        res2 = self.client.post('/api/chatbot/chat/', {
            'message': 'ors kaise banaye',
            'conversation_id': conv_id
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["language"], "hi")
