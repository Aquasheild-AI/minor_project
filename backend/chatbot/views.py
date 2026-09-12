import json
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from .models import ChatConversation, ChatMessage
from .services.chatbot_service import process_message

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_view(request):
    user = request.user
    
    # Enforce COMMUNITY role only
    if user.role != 'COMMUNITY':
        return Response({"error": "Only Community Users can access the AI Health Assistant."}, status=status.HTTP_403_FORBIDDEN)
    
    user_message = request.data.get('message', '').strip()
    conversation_id = request.data.get('conversation_id')
    
    if not user_message:
        return Response({"error": "Message cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
        
    if len(user_message) > 1000:
        return Response({"error": "Message is too long. Please keep it under 1000 characters."}, status=status.HTTP_400_BAD_REQUEST)
    
    # Retrieve or create conversation
    if conversation_id:
        try:
            conversation = ChatConversation.objects.get(id=conversation_id, user=user)
        except ChatConversation.DoesNotExist:
            return Response({"error": "Conversation not found or unauthorized."}, status=status.HTTP_404_NOT_FOUND)
    else:
        conversation = ChatConversation.objects.create(user=user)
    
    # Load previous messages for context
    previous_messages = conversation.messages.order_by('created_at')
    history = [{"role": msg.role, "content": msg.content} for msg in previous_messages]
    
    # Process message via Chatbot Service
    try:
        response_data = process_message(user_message, history)
        
        # Save messages transactionally
        with transaction.atomic():
            ChatMessage.objects.create(conversation=conversation, role='user', content=user_message)
            ChatMessage.objects.create(conversation=conversation, role='model', content=response_data['response'])
            conversation.save() # update updated_at
            
        response_data['conversation_id'] = conversation.id
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        # In a real app, log the exception securely
        print(f"Chatbot error: {e}")
        return Response(
            {"error": "I'm having trouble connecting to the AI assistant right now. Please try again."}, 
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
