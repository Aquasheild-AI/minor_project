import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertTriangle, Info, Bot, User as UserIcon, HeartPulse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authPost } from '@/services/authFetch';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FollowUp {
  type: 'topic' | 'choice';
  label: string;
  value: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  warning?: boolean;
  followUpQuestions?: FollowUp[];
}

export function CommunityChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am the AquaShield AI Health Assistant. I can provide general health information and answer questions about water-borne diseases, symptoms, and prevention. How can I help you today?',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await authPost<any>('/api/chatbot/chat/', {
        message: text.trim(),
        conversation_id: conversationId
      });
      
      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        intent: response.intent,
        warning: response.warning,
        followUpQuestions: response.follow_up_questions
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting to the AI assistant right now. Please try again.",
        warning: true
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleSuggestedQuestion = (value: string) => {
    handleSend(value);
  };
  
  const handleReportSymptoms = () => {
    // Navigate to the existing report page
    // In a fully integrated version, we could pass state { symptoms: '...' }
    navigate('/community/report');
  };

  const suggestedQuestions: FollowUp[] = [
    { type: 'topic', label: 'What is cholera?', value: 'What is cholera?' },
    { type: 'topic', label: 'What are the symptoms of typhoid?', value: 'What are the symptoms of typhoid?' },
    { type: 'topic', label: 'How can I prevent water-borne diseases?', value: 'How can I prevent water-borne diseases?' },
    { type: 'topic', label: 'I have diarrhea and vomiting', value: 'I have diarrhea and vomiting' }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-primary-600 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-white">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">AI Health Assistant</h2>
            <p className="text-primary-100 text-sm">Your community health companion</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-start gap-3 shrink-0">
        <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Disclaimer:</strong> AI Health Assistant provides general health information and symptom guidance. It does not diagnose diseases or replace professional medical advice. For emergencies, seek medical care immediately.
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 1 && (
          <div className="mb-8">
            <p className="text-sm text-slate-500 mb-3 font-medium">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuestion(q.value)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-full transition-colors text-left"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
              msg.role === 'user' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {msg.role === 'user' ? <UserIcon className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </div>
            
            <div className={`max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-2xl px-5 py-3 ${
                msg.role === 'user' 
                  ? 'bg-primary-600 text-white rounded-tr-none' 
                  : msg.warning 
                    ? 'bg-red-50 text-red-900 border border-red-100 rounded-tl-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none'
              }`}>
                {msg.warning && (
                  <div className="flex items-center gap-2 mb-2 text-red-700 font-medium border-b border-red-200 pb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Important Notice</span>
                  </div>
                )}
                <div className="text-sm leading-relaxed overflow-hidden">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                      li: ({ node, ...props }) => <li className="" {...props} />,
                      h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-2 mt-2 first:mt-0" {...props} />,
                      a: ({ node, ...props }) => <a className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                      code: ({ node, inline, ...props }: any) => 
                        inline 
                          ? <code className="bg-black/5 rounded px-1 py-0.5 text-xs font-mono" {...props} />
                          : <pre className="bg-black/5 rounded p-2 text-xs font-mono overflow-x-auto mb-2"><code {...props} /></pre>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
              
              {/* Follow up questions & Actions (only for assistant) */}
              {msg.role === 'assistant' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.followUpQuestions?.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedQuestion(q.value)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                        q.type === 'choice' 
                          ? 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
                          : 'bg-white border border-primary-200 text-primary-700 hover:bg-primary-50'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                  
                  {(msg.intent === 'symptom_guidance' || msg.intent === 'warning_signs') && (
                    <button
                      onClick={handleReportSymptoms}
                      className="flex items-center gap-1.5 text-xs bg-rose-100 border border-rose-200 text-rose-700 hover:bg-rose-200 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      <HeartPulse className="h-3.5 w-3.5" />
                      Report These Symptoms
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600">
              <Bot className="h-5 w-5" />
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-tl-none px-5 py-4 flex gap-1 items-center">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="relative flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 py-3 pl-4 pr-12 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 max-h-32 min-h-[52px]"
            rows={1}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          Press Enter to send, Shift + Enter for new line.
        </p>
      </div>
    </div>
  );
}
