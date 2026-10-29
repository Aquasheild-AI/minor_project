import React from 'react';
import { Check, X, AlertTriangle, Info, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { VoiceWaveform } from './VoiceWaveform';
import type { SpeechRecognitionErrorCode } from '@/hooks/useSpeechRecognition';

interface VoiceInputBannerProps {
  isListening: boolean;
  interimTranscript: string;
  activeLang: 'hi-IN' | 'en-IN';
  onLangChange: (lang: 'hi-IN' | 'en-IN') => void;
  onStop: () => void;
  onCancel: () => void;
  error: SpeechRecognitionErrorCode | string | null;
  onClearError: () => void;
  hasConfirmedSpeech?: boolean;
}

export const VoiceInputBanner: React.FC<VoiceInputBannerProps> = ({
  isListening,
  interimTranscript,
  activeLang,
  onLangChange,
  onStop,
  onCancel,
  error,
  onClearError,
  hasConfirmedSpeech = false,
}) => {
  const { t } = useTranslation();

  const getErrorMessage = (err: string) => {
    switch (err) {
      case 'not-allowed':
        return t('community.chatbot.voice.permissionDenied');
      case 'no-speech':
        return t('community.chatbot.voice.noSpeech');
      case 'not-supported':
        return t('community.chatbot.voice.notSupported');
      case 'network':
        return t('community.chatbot.voice.networkError');
      case 'ttsNotSupported':
        return t('community.chatbot.voice.ttsNotSupported');
      case 'ttsVoiceUnavailable':
        return t('community.chatbot.voice.ttsVoiceUnavailable');
      default:
        return t('community.chatbot.voice.genericError');
    }
  };

  return (
    <div className="space-y-2 mb-2">
      {/* Error Banner */}
      {error && (
        <div
          className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 text-red-800 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm animate-in fade-in duration-200"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="leading-snug">{getErrorMessage(error)}</p>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-red-500 hover:text-red-800 p-0.5 rounded transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Confirmed speech review guidance */}
      {hasConfirmedSpeech && !isListening && (
        <div
          className="flex items-center justify-between bg-primary-50 border border-primary-100 text-primary-800 px-3 py-1.5 rounded-lg text-xs animate-in fade-in duration-150"
          role="status"
        >
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-primary-600 shrink-0" />
            <span>{t('community.chatbot.voice.reviewBeforeSending')}</span>
          </div>
        </div>
      )}

      {/* Active Listening Panel */}
      {isListening && (
        <div
          className="bg-slate-900 text-white rounded-xl p-3 shadow-lg border border-slate-800 flex flex-col gap-2.5 animate-in slide-in-from-bottom-2 duration-200"
          role="region"
          aria-label="Voice input active"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Waveform and status */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <VoiceWaveform variant="listening" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  {t('community.chatbot.voice.listening')}
                </span>
                <span className="text-[11px] text-slate-300">
                  {t('community.chatbot.voice.listeningPrompt')}
                </span>
              </div>
            </div>

            {/* Language toggle and Actions */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Language selection pills */}
              <div
                className="inline-flex items-center rounded-lg bg-slate-800 p-0.5 text-xs font-medium border border-slate-700"
                title={t('community.chatbot.voice.switchLang')}
              >
                <button
                  type="button"
                  onClick={() => onLangChange('hi-IN')}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition-colors ${
                    activeLang === 'hi-IN'
                      ? 'bg-primary-600 text-white font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  aria-label="Select Hindi speech input"
                >
                  हिंदी
                </button>
                <button
                  type="button"
                  onClick={() => onLangChange('en-IN')}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition-colors ${
                    activeLang === 'en-IN'
                      ? 'bg-primary-600 text-white font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  aria-label="Select English speech input"
                >
                  EN
                </button>
              </div>

              {/* Done / Stop button */}
              <button
                type="button"
                onClick={onStop}
                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shadow-xs"
                title={t('community.chatbot.voice.stopVoice')}
              >
                <Check className="h-3.5 w-3.5" />
                <span>{t('community.chatbot.voice.stopVoice')}</span>
              </button>

              {/* Cancel button */}
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border border-slate-700"
                title={t('community.chatbot.voice.cancelVoice')}
              >
                <X className="h-3.5 w-3.5" />
                <span>{t('community.chatbot.voice.cancelVoice')}</span>
              </button>
            </div>
          </div>

          {/* Real-time transcribed text preview */}
          {interimTranscript && (
            <div className="bg-slate-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 italic border border-slate-700/50">
              <span className="text-slate-400 font-normal mr-1.5">
                "{interimTranscript}..."
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

