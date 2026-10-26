import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'button' | 'dropdown' | 'compact';
}

const languages = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'हिंदी', native: 'हिंदी' },
] as const;

export function LanguageSwitcher({ className = '', variant = 'dropdown' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => i18n.language?.startsWith(l.code)) || languages[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (code: 'en' | 'hi') => {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem('aquashield_language', code);
    } catch {
      // ignore storage errors
    }
    setOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium ${className}`}>
        <button
          type="button"
          onClick={() => handleSelectLanguage('en')}
          className={`rounded-md px-2 py-1 transition-colors ${
            currentLang.code === 'en'
              ? 'bg-primary-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label="Switch to English"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => handleSelectLanguage('hi')}
          className={`rounded-md px-2 py-1 transition-colors ${
            currentLang.code === 'hi'
              ? 'bg-primary-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label="Switch to Hindi"
        >
          हिं
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Change Language"
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5 text-primary-600" />
        <span className="font-semibold text-slate-800">{currentLang.native}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Language / भाषा
          </div>
          {languages.map((lang) => {
            const isSelected = currentLang.code === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-primary-50 font-bold text-primary-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{lang.native}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
