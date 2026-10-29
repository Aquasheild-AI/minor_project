import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  AlertTriangle,
  Info,
  Bot,
  User as UserIcon,
  HeartPulse,
  Mic,
  Square,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authPost } from '@/services/authFetch';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';

import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { VoiceMessagePlayer } from './components/VoiceMessagePlayer';
import { VoiceInputBanner } from './components/VoiceInputBanner';

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
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: t('community.chatbot.welcomeMsg'),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [hasConfirmedSpeech, setHasConfirmedSpeech] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousInputRef = useRef<string>('');
  const navigate = useNavigate();

  // Determine current active language code for speech
  const defaultSpeechLang: 'hi-IN' | 'en-IN' = i18n.language?.startsWith('hi')
    ? 'hi-IN'
    : 'en-IN';

  // Speech-to-Text hook
  const {
    isListening,
    interimTranscript,
    error: sttError,
    clearError: clearSttError,
    selectedLang,
    setSelectedLang,
    startListening,
    stopListening,
    abortListening,
  } = useSpeechRecognition({
    defaultLang: defaultSpeechLang,
    onResult: (finalText) => {
      // Keep previous text if any and append final recognized speech
      const base = previousInputRef.current.trim();
      const combined = base ? `${base} ${finalText}` : finalText;
      setInput(combined);
      setHasConfirmedSpeech(true);
    },
  });

  // Text-to-Speech hook
  const {
    speakingMessageId,
    isPlaying,
    isPaused,
    error: ttsError,
    clearError: clearTtsError,
    speak,
    pause,
    resume,
    stop: stopSpeaking,
  } = useSpeechSynthesis();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Update initial welcome message if user toggles language before messaging
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [
          {
            id: 'welcome',
            role: 'assistant',
            content: t('community.chatbot.welcomeMsg'),
          },
        ];
      }
      return prev;
    });
  }, [t, i18n.language]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // Stop active audio or mic session
    if (isListening) {
      stopListening();
    }
    stopSpeaking();
    setHasConfirmedSpeech(false);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    previousInputRef.current = '';
    setIsLoading(true);

    try {
      const response = await authPost<any>('/api/chatbot/chat/', {
        message: text.trim(),
        conversation_id: conversationId,
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
        followUpQuestions: response.follow_up_questions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I'm having trouble connecting to the AI assistant right now. Please try again.",
        warning: true,
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
    stopSpeaking();
    navigate('/community/report');
  };

  // Toggle voice recognition
  const handleToggleVoiceInput = () => {
    clearSttError();
    clearTtsError();

    if (isListening) {
      // User clicked stop: finish recording
      stopListening();
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } else {
      // Save current input before speech starts so user can revert on cancel
      previousInputRef.current = input;
      setHasConfirmedSpeech(false);
      startListening(selectedLang);
    }
  };

  const handleCancelVoice = () => {
    abortListening();
    setInput(previousInputRef.current);
    setHasConfirmedSpeech(false);
  };

  const handleStopVoice = () => {
    stopListening();
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const activeError = sttError || ttsError;
  const handleClearError = () => {
    clearSttError();
    clearTtsError();
  };

  const suggestedQuestions: FollowUp[] = [
    {
      type: 'topic',
      label: t('community.chatbot.questions.cholera'),
      value: t('community.chatbot.questions.cholera'),
    },
    {
      type: 'topic',
      label: t('community.chatbot.questions.typhoid'),
      value: t('community.chatbot.questions.typhoid'),
    },
    {
      type: 'topic',
      label: t('community.chatbot.questions.prevent'),
      value: t('community.chatbot.questions.prevent'),
    },
    {
      type: 'topic',
      label: t('community.chatbot.questions.symptoms'),
      value: t('community.chatbot.questions.symptoms'),
    },
  ];

  return (
    <div
      className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
      data-tour="chatbot-interface"
    >
      {/* Header */}
      <div className="bg-primary-600 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-white">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">
              {t('community.chatbot.title')}
            </h2>
            <p className="text-primary-100 text-sm">
              {t('community.chatbot.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-start gap-3 shrink-0">
        <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          {t('community.chatbot.disclaimer')}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 1 && (
          <div className="mb-8">
            <p className="text-sm text-slate-500 mb-3 font-medium">
              {t('community.chatbot.suggested')}:
            </p>
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
            className={`flex gap-4 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                msg.role === 'user'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {msg.role === 'user' ? (
                <UserIcon className="h-5 w-5" />
              ) : (
                <Bot className="h-5 w-5" />
              )}
            </div>

            <div
              className={`max-w-[80%] flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`rounded-2xl px-5 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-none'
                    : msg.warning
                    ? 'bg-red-50 text-red-900 border border-red-100 rounded-tl-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none'
                }`}
              >
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
                      p: ({ node, ...props }) => (
                        <p className="mb-2 last:mb-0" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul
                          className="list-disc pl-5 mb-2 space-y-1"
                          {...props}
                        />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol
                          className="list-decimal pl-5 mb-2 space-y-1"
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => <li className="" {...props} />,
                      h1: ({ node, ...props }) => (
                        <h1
                          className="text-lg font-bold mb-2 mt-3 first:mt-0"
                          {...props}
                        />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2
                          className="text-base font-bold mb-2 mt-3 first:mt-0"
                          {...props}
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3
                          className="text-sm font-bold mb-2 mt-2 first:mt-0"
                          {...props}
                        />
                      ),
                      a: ({ node, ...props }) => (
                        <a
                          className="text-primary-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold" {...props} />
                      ),
                      code: ({ node, inline, ...props }: any) =>
                        inline ? (
                          <code
                            className="bg-black/5 rounded px-1 py-0.5 text-xs font-mono"
                            {...props}
                          />
                        ) : (
                          <pre className="bg-black/5 rounded p-2 text-xs font-mono overflow-x-auto mb-2">
                            <code {...props} />
                          </pre>
                        ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Actions & Voice Player for assistant messages */}
              {msg.role === 'assistant' && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {/* Voice Listen Button & Audio Controls */}
                  <VoiceMessagePlayer
                    messageId={msg.id}
                    content={msg.content}
                    speakingMessageId={speakingMessageId}
                    isPlaying={isPlaying}
                    isPaused={isPaused}
                    onSpeak={(id, text) => speak(id, text, i18n.language)}
                    onPause={pause}
                    onResume={resume}
                    onStop={stopSpeaking}
                  />

                  {/* Follow-up question pills */}
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

                  {/* Report symptoms button */}
                  {(msg.intent === 'symptom_guidance' ||
                    msg.intent === 'warning_signs') && (
                    <button
                      onClick={handleReportSymptoms}
                      className="flex items-center gap-1.5 text-xs bg-rose-100 border border-rose-200 text-rose-700 hover:bg-rose-200 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      <HeartPulse className="h-3.5 w-3.5" />
                      {t('community.chatbot.reportAction')}
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
              <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="max-w-3xl mx-auto">
          {/* Active Listening / Voice error / Confirmation Banner */}
          <VoiceInputBanner
            isListening={isListening}
            interimTranscript={interimTranscript}
            activeLang={selectedLang}
            onLangChange={(lang) => {
              setSelectedLang(lang);
              if (isListening) {
                // Restart listening with new language immediately
                startListening(lang);
              }
            }}
            onStop={handleStopVoice}
            onCancel={handleCancelVoice}
            error={activeError}
            onClearError={handleClearError}
            hasConfirmedSpeech={hasConfirmedSpeech}
          />

          <div className="flex items-end gap-2.5">
            {/* Input textarea with Send button */}
            <div className="relative flex-1 flex items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (hasConfirmedSpeech) {
                    setHasConfirmedSpeech(false);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={t('community.chatbot.inputPlaceholder')}
                className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 py-3 pl-4 pr-12 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 max-h-32 min-h-[52px]"
                rows={1}
              />
              <button
                type="button"
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isLoading}
                aria-label={t('community.chatbot.send')}
                className="absolute right-2.5 bottom-2.5 p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Clearly visible Microphone button next to chat input */}
            <button
              type="button"
              onClick={handleToggleVoiceInput}
              disabled={isLoading}
              aria-label={
                isListening
                  ? t('community.chatbot.voice.stopVoice')
                  : t('community.chatbot.voice.speakQuestion')
              }
              title={
                isListening
                  ? t('community.chatbot.voice.stopVoice')
                  : t('community.chatbot.voice.speakQuestion')
              }
              className={`p-3 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-1 min-h-[52px] min-w-[52px] ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse focus:ring-red-400 shadow-red-200'
                  : 'bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 focus:ring-primary-500'
              }`}
            >
              {isListening ? (
                <Square className="h-5 w-5 fill-current" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
            <span>
              {isListening
                ? `${t('community.chatbot.voice.listening')} (${
                    selectedLang === 'hi-IN'
                      ? t('community.chatbot.voice.langHindi')
                      : t('community.chatbot.voice.langEnglish')
                  })`
                : t('community.chatbot.voice.pressToSpeak', {
                    defaultValue: 'Click microphone to speak or type your question',
                  })}
            </span>
            <span className="hidden sm:inline">
              Press Enter to send, Shift + Enter for new line.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
