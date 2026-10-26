import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (!authLoading && user) {
    const dest =
      user.role === 'admin'
        ? '/dashboard'
        : user.role === 'worker'
          ? '/worker/dashboard'
          : '/community/home';
    navigate(dest, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError(t('auth.errors.required', { defaultValue: 'Please enter your username and password.' }));
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || t('auth.errors.loginFailed', { defaultValue: 'Login failed. Please check your credentials.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left panel */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-primary-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold">{t('common.appName')}</p>
            <p className="text-sm text-primary-200">{t('common.appTagline')}</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            {t('auth.welcomeTitle')}
          </h1>
          <p className="mt-4 text-primary-200">
            {t('auth.welcomeSubtitle')}
          </p>
          <p className="mt-8 text-lg font-medium text-white">
            {t('auth.motto')}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-primary-300">
          <ShieldCheck className="h-4 w-4" />
          {t('common.portal')}
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-1/3 h-64 w-64 rounded-full bg-primary-400 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-primary-500 blur-3xl" />
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="relative flex w-full items-center justify-center p-6 lg:w-1/2">
        {/* Language selector in top right */}
        <div className="absolute top-6 right-6">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <p className="font-bold text-slate-900">{t('common.appName')}</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">{t('auth.signInTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('auth.signInSubtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="label">{t('auth.username')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('auth.usernamePlaceholder')}
                  className="input pl-10"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="input px-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                {t('auth.rememberMe')}
              </label>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? t('common.buttons.signingIn') : t('common.buttons.signIn')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
              {t('auth.createOne')}
            </Link>
          </p>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
            <Lock className="h-3 w-3" />
            {t('common.securePortal')}
          </p>
        </div>
      </div>
    </div>
  );
}

