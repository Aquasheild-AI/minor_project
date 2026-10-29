import React from 'react';
import { Volume2, Pause, Play, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { VoiceWaveform } from './VoiceWaveform';

interface VoiceMessagePlayerProps {
  messageId: string;
  content: string;
  speakingMessageId: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  onSpeak: (id: string, content: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  messageId,
  content,
  speakingMessageId,
  isPlaying,
  isPaused,
  onSpeak,
  onPause,
  onResume,
  onStop,
}) => {
  const { t } = useTranslation();
  const isThisSpeaking = speakingMessageId === messageId;

  if (isThisSpeaking) {
    return (
      <div
        className="inline-flex items-center gap-2 bg-primary-50/90 border border-primary-200 text-primary-900 rounded-lg px-2.5 py-1 text-xs shadow-xs animate-in fade-in duration-200"
        role="region"
        aria-label="Audio playback controls"
      >
        <div className="flex items-center gap-1.5">
          {isPlaying ? (
            <VoiceWaveform variant="speaking" className="h-4" />
          ) : (
            <Volume2 className="h-3.5 w-3.5 text-amber-600" />
          )}
          <span className="font-medium text-primary-800 text-[11px] sm:text-xs">
            {isPlaying
              ? t('community.chatbot.voice.playing')
              : t('community.chatbot.voice.paused')}
          </span>
        </div>

        <div className="flex items-center gap-0.5 border-l border-primary-200 pl-1.5 ml-0.5">
          {isPlaying ? (
            <button
              type="button"
              onClick={onPause}
              className="p-1 rounded text-primary-700 hover:bg-primary-100 hover:text-primary-900 transition-colors focus:outline-none focus:ring-1 focus:ring-primary-500"
              title={t('community.chatbot.voice.pause')}
              aria-label={t('community.chatbot.voice.pause')}
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onResume}
              className="p-1 rounded text-primary-700 hover:bg-primary-100 hover:text-primary-900 transition-colors focus:outline-none focus:ring-1 focus:ring-primary-500"
              title={t('community.chatbot.voice.resume')}
              aria-label={t('community.chatbot.voice.resume')}
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onStop}
            className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-1 focus:ring-red-400"
            title={t('community.chatbot.voice.stop')}
            aria-label={t('community.chatbot.voice.stop')}
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSpeak(messageId, content)}
      className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-primary-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      title={t('community.chatbot.voice.listenAnswer')}
      aria-label={t('community.chatbot.voice.listenAnswer')}
    >
      <Volume2 className="h-3.5 w-3.5 text-primary-600" />
      <span className="font-medium">{t('community.chatbot.voice.listen')}</span>
    </button>
  );
};

