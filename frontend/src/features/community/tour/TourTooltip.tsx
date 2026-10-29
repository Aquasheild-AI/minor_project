import { useEffect, useMemo } from 'react';
import type { TooltipRenderProps } from 'react-joyride';
import {
  Shield,
  Activity,
  Droplets,
  AlertTriangle,
  Bot,
  Bell,
  Compass,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import type { TourIconType, TourStepData } from './types';
import { useTranslation } from 'react-i18next';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { VoiceMessagePlayer } from '@/features/community/components/VoiceMessagePlayer';

const iconMap: Record<TourIconType, React.ElementType> = {
  shield: Shield,
  activity: Activity,
  droplets: Droplets,
  alert: AlertTriangle,
  bot: Bot,
  bell: Bell,
  compass: Compass,
};

export function TourTooltip(props: TooltipRenderProps) {
  const {
    index,
    size,
    isLastStep,
    step,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
  } = props;

  const { t, i18n } = useTranslation();
  const isHi = i18n.language?.startsWith('hi');

  const data = (step.data || {}) as Partial<TourStepData>;
  const IconComponent = (data.icon && iconMap[data.icon]) || Sparkles;
  const progressPercent = Math.round(((index + 1) / size) * 100);

  // Text-to-speech for tour narration
  const {
    speakingMessageId,
    isPlaying,
    isPaused,
    speak,
    pause,
    resume,
    stop,
  } = useSpeechSynthesis();

  // Cancel speech when advancing to another step
  useEffect(() => {
    stop();
  }, [index, stop]);

  const stepNarrationText = useMemo(() => {
    const parts: string[] = [];
    if (step.title) parts.push(String(step.title));
    if (step.content) parts.push(String(step.content));
    if (data.tip) {
      const tipPrefix = isHi ? 'रक्षक सुझाव: ' : 'Guardian Tip: ';
      parts.push(`${tipPrefix} ${data.tip}`);
    }
    return parts.join('. ');
  }, [step.title, step.content, data.tip, isHi]);

  const handleClose = (e: React.MouseEvent<HTMLElement>) => {
    stop();
    closeProps.onClick?.(e);
  };

  const handleSkip = (e: React.MouseEvent<HTMLElement>) => {
    stop();
    skipProps.onClick?.(e);
  };

  const handleBack = (e: React.MouseEvent<HTMLElement>) => {
    stop();
    backProps.onClick?.(e);
  };

  const handlePrimary = (e: React.MouseEvent<HTMLElement>) => {
    stop();
    primaryProps.onClick?.(e);
  };

  return (
    <div
      {...tooltipProps}
      className="relative z-50 w-[calc(100vw-2rem)] sm:w-[410px] max-w-[420px] rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl transition-all duration-200 focus:outline-none"
    >
      {/* Top bar with mission badge, voice narration, & close button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-100 text-primary-700 shadow-sm shrink-0">
            <IconComponent className="h-4 w-4" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 border border-primary-200/60 truncate">
            <Sparkles className="h-3 w-3 text-primary-600 animate-pulse shrink-0" />
            <span className="truncate">
              {isHi ? `चरण ${index + 1} / ${size}` : `Step ${index + 1} of ${size}`}
              {data.mission ? ` • ${data.mission}` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Voice Narration Player for this step */}
          <VoiceMessagePlayer
            messageId={`tour-step-${index}`}
            content={stepNarrationText}
            speakingMessageId={speakingMessageId}
            isPlaying={isPlaying}
            isPaused={isPaused}
            onSpeak={(id, text) => speak(id, text, i18n.language)}
            onPause={pause}
            onResume={resume}
            onStop={stop}
          />

          <button
            {...closeProps}
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={t('common.buttons.skipTour')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-3.5 text-base font-bold text-slate-900 tracking-tight">
        {step.title}
      </h3>

      {/* Progress Bar */}
      <div className="mt-2 mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Content */}
      <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
        {step.content}
      </div>

      {/* Guardian Tip */}
      {data.tip && (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-xs text-primary-900">
          <Sparkles className="h-4 w-4 text-primary-600 flex-shrink-0 mt-0.5" />
          <div className="leading-snug">
            <span className="font-bold text-primary-800">
              {isHi ? 'रक्षक सुझाव: ' : 'Guardian Tip: '}
            </span>
            <span className="text-slate-700">{data.tip}</span>
          </div>
        </div>
      )}

      {/* Controls Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
        <button
          {...skipProps}
          onClick={handleSkip}
          className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors focus:outline-none focus:underline"
        >
          {t('common.buttons.skipTour')}
        </button>

        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              onClick={handleBack}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 shadow-sm"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>{t('common.previous')}</span>
            </button>
          )}

          <button
            {...primaryProps}
            onClick={handlePrimary}
            className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1 shadow-sm"
          >
            {isLastStep ? (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                <span>{t('common.buttons.finishTour')}</span>
              </>
            ) : (
              <>
                <span>{t('common.next')}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
