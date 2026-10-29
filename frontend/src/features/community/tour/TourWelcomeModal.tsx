import { useMemo, useEffect } from 'react';
import { Shield, Sparkles, Droplets, Bot, ArrowRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { VoiceMessagePlayer } from '@/features/community/components/VoiceMessagePlayer';

interface TourWelcomeModalProps {
  open: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export function TourWelcomeModal({ open, onStart, onSkip }: TourWelcomeModalProps) {
  const { t, i18n } = useTranslation();

  const {
    speakingMessageId,
    isPlaying,
    isPaused,
    speak,
    pause,
    resume,
    stop,
  } = useSpeechSynthesis();

  // Stop speech if modal is closed
  useEffect(() => {
    if (!open) {
      stop();
    }
  }, [open, stop]);

  const welcomeNarrationText = useMemo(() => {
    return [
      t('tour.welcomeModal.title'),
      t('tour.welcomeModal.subtitle'),
      t('tour.welcomeModal.intro'),
      `${t('tour.welcomeModal.item1Title')}. ${t('tour.welcomeModal.item1Desc')}`,
      `${t('tour.welcomeModal.item2Title')}. ${t('tour.welcomeModal.item2Desc')}`,
      `${t('tour.welcomeModal.item3Title')}. ${t('tour.welcomeModal.item3Desc')}`,
    ].join('. ');
  }, [t]);

  if (!open) return null;

  const handleStart = () => {
    stop();
    onStart();
  };

  const handleSkip = () => {
    stop();
    onSkip();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={handleSkip}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Decorative banner */}
        <div className="relative bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-primary-100 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
              <span>{t('tour.welcomeModal.badge')}</span>
            </div>

            <div className="flex items-center gap-2">
              <VoiceMessagePlayer
                messageId="tour-welcome-modal"
                content={welcomeNarrationText}
                speakingMessageId={speakingMessageId}
                isPlaying={isPlaying}
                isPaused={isPaused}
                onSpeak={(id, text) => speak(id, text, i18n.language)}
                onPause={pause}
                onResume={resume}
                onStop={stop}
              />
              <button
                onClick={handleSkip}
                className="rounded-lg p-1.5 text-primary-200 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Skip Tour"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight">
            {t('tour.welcomeModal.title')}
          </h2>
          <p className="mt-1 text-sm text-primary-100">
            {t('tour.welcomeModal.subtitle')}
          </p>
        </div>

        {/* Body content */}
        <div className="p-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            {t('tour.welcomeModal.intro')}
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{t('tour.welcomeModal.item1Title')}</p>
                <p className="text-xs text-slate-500">{t('tour.welcomeModal.item1Desc')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{t('tour.welcomeModal.item2Title')}</p>
                <p className="text-xs text-slate-500">{t('tour.welcomeModal.item2Desc')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{t('tour.welcomeModal.item3Title')}</p>
                <p className="text-xs text-slate-500">{t('tour.welcomeModal.item3Desc')}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
            <span>{t('tour.welcomeModal.metaTime')}</span>
            <span>{t('tour.welcomeModal.metaReplay')}</span>
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              onClick={handleSkip}
              className="btn-secondary w-full sm:w-auto text-sm text-slate-600 hover:text-slate-800"
            >
              {t('tour.welcomeModal.skip')}
            </button>
            <button
              onClick={handleStart}
              className="btn-primary w-full sm:w-auto text-sm flex items-center justify-center gap-2 px-5 py-2.5 shadow-md shadow-primary-600/20"
            >
              <span>{t('tour.welcomeModal.start')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
