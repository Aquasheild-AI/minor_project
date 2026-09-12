# AquaShield AI - Chatbot Architecture

## 1. Purpose
The AI Health Assistant is an educational and symptom-guidance chatbot for Community Users. It uses a structured knowledge base to provide consistent, safe medical information without diagnosing or prescribing treatments. 

## 2. Architecture
The chatbot operates on a three-tier architecture:
- **Frontend**: React (Vite) providing a user-friendly chat interface.
- **Backend API**: Django REST Framework for authentication, validation, and conversation storage.
- **AI Service**: Google Gemini (gemini-2.5-flash) guided by system prompts and grounded by the JSON knowledge base.

## 3. Frontend Structure
- **Component**: `CommunityChatbot.tsx` is the primary chat interface.
- **Routing**: Added to `App.tsx` under `/community/chat`.
- **Navigation**: Integrated into `CommunitySidebar.tsx` and `CommunityLayout.tsx`.
- **API**: Communicates with the backend using the existing `authPost` wrapper from `authFetch.ts`.

## 4. Backend Structure
- **App**: A new Django app called `chatbot`.
- **Models**: `ChatConversation` and `ChatMessage` to persist histories securely.
- **Views**: A single `chat_view` enforcing the `COMMUNITY` role.
- **Services**: Abstracted into `knowledge_base.py`, `gemini_service.py`, and `chatbot_service.py`.

## 5. Knowledge Base
The primary source of truth is `backend/chatbot/knowledge/diseases.json`. The `KnowledgeBase` class loads this JSON and provides methods to find conditions, match symptoms based on rules, and detect warning signs. 

## 6. Gemini Integration
We use the official `google-genai` SDK. The request flow is:
1. User message arrives.
2. `detect_intent_and_context` searches the knowledge base.
3. System instruction + KB Context + Chat History are sent to Gemini.
4. Gemini generates a natural language response.
5. Safety layer checks for inappropriate language before returning.

## 7. Environment Variables
`GEMINI_API_KEY` is loaded from `backend/.env`. Missing keys are handled gracefully.

## 8. API Endpoints
- **POST `/api/chatbot/chat/`**: Accepts `{ "message": "...", "conversation_id": 123 }`. Returns the generated response, intent, warnings, and follow-up questions.

## 9. Intent Detection
A heuristic approach in `chatbot_service.py` detects intents (e.g., `disease_information`, `prevention`, `symptom_guidance`) by matching keywords against the knowledge base.

## 10. Symptom Matching
The knowledge base includes `symptom_matching_rules`. If a user mentions symptoms that match a rule, the possible conditions are extracted and passed to Gemini as context, along with a reminder that symptoms alone cannot confirm a diagnosis.

## 11. Safety Layer
- **Warning Detection**: If urgent warning signs (like "severe dehydration") are mentioned, a warning flag is activated.
- **Post-generation filtering**: Checks for diagnostic language ("you have cholera") and replaces it with a generic fallback.

## 12. Conversation Persistence
Messages are saved transactionally to `ChatConversation` and `ChatMessage`, ensuring they belong to the authenticated user.

## 13. Authentication/RBAC
The endpoint explicitly checks `if user.role != 'COMMUNITY':` and returns a 403 Forbidden.

## 14. Symptom Reporting
When the intent is `symptom_guidance` or `warning_signs`, the frontend renders a "Report These Symptoms" button that redirects the user to the existing `/community/report` page.

## 15. Water-quality Integration
Future integration can be added to the intent detector in `chatbot_service.py` by calling `Village` models to get `risk_score` and `water_quality_tests` data.

## 16. Testing
Backend test logic has been prepared to handle graceful failures and invalid requests. 

## 17. How to add/update diseases
Simply edit `backend/chatbot/knowledge/diseases.json`. The `KnowledgeBase` service reads it dynamically. No backend code changes are required.

## 18. Medical Disclaimer
A prominent disclaimer is displayed at the top of the chat UI, informing users that the bot is not a doctor.

## 19. Known Limitations
- Intent detection uses basic string matching rather than vector embeddings.
- Water quality integration is not fully implemented pending real API data mapping.

## 20. Future Improvements
- Integrate RAG (Retrieval-Augmented Generation) using vector search for complex queries.
- Pre-fill the symptom reporting form via state passing when clicking "Report These Symptoms".
- Fully integrate the village's active risk score directly into the chat.
