import { Trophy, CheckCircle2, ArrowRight, RotateCcw, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TourCompletionModalProps {
  open: boolean;
  onClose: () => void;
  onReplay: () => void;
}

export function TourCompletionModal({ open, onClose, onReplay }: TourCompletionModalProps) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-20"
          aria-label={t('common.close')}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Celebration header */}
        <div className="relative bg-gradient-to-b from-primary-50 via-white to-white p-6 pb-2 text-center">
          <div className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30">
            <Trophy className="h-10 w-10 text-amber-300" />
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-white shadow">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 mb-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{t('tour.completionModal.badge')}</span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {t('tour.completionModal.title')}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            {t('tour.completionModal.desc')}
          </p>
        </div>

        {/* Achievement Badges */}
        <div className="px-6 py-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span>{t('tour.completionModal.achievement1')}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span>{t('tour.completionModal.achievement2')}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span>{t('tour.completionModal.achievement3')}</span>
            </div>
          </div>

          <p className="mt-3.5 text-center text-xs text-slate-400">
            {t('tour.completionModal.tip')}
          </p>

          {/* Action buttons */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              onClick={onReplay}
              className="btn-secondary w-full sm:w-auto text-xs flex items-center justify-center gap-1.5 py-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('tour.completionModal.replay')}</span>
            </button>
            <button
              onClick={onClose}
              className="btn-primary w-full sm:w-auto text-xs flex items-center justify-center gap-1.5 px-4 py-2 shadow-sm"
            >
              <span>{t('tour.completionModal.explore')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
