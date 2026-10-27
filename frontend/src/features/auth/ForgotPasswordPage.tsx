import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Mail,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

type Step = 'REQUEST' | 'VERIFY_AND_RESET' | 'SUCCESS';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('REQUEST');
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resend cooldown timer in seconds
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'VERIFY_AND_RESET' && resendCooldown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  // 1. Request OTP via Email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('auth.errors.emailRequired', { defaultValue: 'Please enter your registered email address.' }));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(t('auth.errors.invalidEmail', { defaultValue: 'Please enter a valid email address.' }));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset/request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setMaskedEmail(data.message?.match(/to (.*)\./)?.[1] || trimmedEmail);
      setSuccessMessage(data.message || 'Verification code sent successfully.');
      setStep('VERIFY_AND_RESET');
      setResendCooldown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || 'Unable to process your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/password-reset/request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend verification code.');

      setSuccessMessage(data.message || 'A new verification code has been sent.');
      setResendCooldown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Confirm Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError(t('auth.errors.otpRequired', { defaultValue: 'Please enter the 6-digit verification code.' }));
      return;
    }

    if (!newPassword) {
      setError(t('auth.errors.newPasswordRequired', { defaultValue: 'Please enter your new password.' }));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('auth.errors.passwordMinLength', { defaultValue: 'Password must be at least 8 characters long.' }));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.errors.passwordMismatch', { defaultValue: 'Passwords do not match.' }));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset/confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: cleanOtp,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');

      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left branding panel */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-slate-900 via-primary-950 to-primary-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur border border-white/20 shadow-inner">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">{t('common.appName', { defaultValue: 'AquaShield AI' })}</p>
            <p className="text-xs text-primary-200 uppercase tracking-widest">{t('common.appTagline', { defaultValue: 'Early Warning Surveillance' })}</p>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-3.5 py-1.5 text-xs font-semibold text-primary-300 border border-primary-500/20 backdrop-blur">
            <KeyRound className="h-3.5 w-3.5" />
            <span>Secure Account Recovery</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            {t('auth.forgotPasswordHeroTitle', { defaultValue: 'Reset your password with verified security.' })}
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">
            {t('auth.forgotPasswordHeroDesc', {
              defaultValue:
                'Whether you are a Community Citizen, Health Worker, or Administrative Authority, your account is protected with SMTP multi-factor verification.',
            })}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
            <div className="rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur">
              <p className="text-xl font-bold text-white">6-Digit OTP</p>
              <p className="text-xs text-primary-200 mt-1">Direct to your registered email</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3.5 border border-white/10 backdrop-blur">
              <p className="text-xl font-bold text-white">15 Minutes</p>
              <p className="text-xs text-primary-200 mt-1">Encrypted code expiration</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-primary-400" />
          <span>Government of India &bull; Public Health &amp; Water Surveillance Network</span>
        </div>

        {/* Ambient background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary-600/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-cyan-600/20 blur-3xl" />
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="absolute top-6 right-6">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="mb-6 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 shadow-md">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <p className="font-bold text-slate-900">{t('common.appName', { defaultValue: 'AquaShield AI' })}</p>
            </div>
          </div>

          {/* STEP 1: Request OTP */}
          {step === 'REQUEST' && (
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('common.buttons.backToLogin', { defaultValue: 'Back to Sign In' })}
              </Link>

              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 border border-primary-100">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    {t('auth.forgotPasswordTitle', { defaultValue: 'Forgot password?' })}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t('auth.forgotPasswordSubtitle', { defaultValue: 'No worries, we will send you reset instructions.' })}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                {t('auth.forgotPasswordInstruction', {
                  defaultValue:
                    'Enter the email address associated with your account (Community, Health Worker, or Authority) and we will send a 6-digit verification code.',
                })}
              </p>

              <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
                <div>
                  <label className="label">
                    {t('auth.registeredEmail', { defaultValue: 'Registered Email Address' })}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="input pl-10"
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 shadow-sm font-semibold"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {loading
                    ? t('common.buttons.sendingCode', { defaultValue: 'Sending Verification Code...' })
                    : t('common.buttons.sendCode', { defaultValue: 'Send Verification Code' })}
                </button>
              </form>

              <p className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <Lock className="h-3 w-3" />
                {t('common.securePortal', { defaultValue: 'AquaShield Encrypted Authentication' })}
              </p>
            </div>
          )}

          {/* STEP 2: Enter OTP & New Password */}
          {step === 'VERIFY_AND_RESET' && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setStep('REQUEST');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('auth.changeEmail', { defaultValue: 'Change email address' })}
              </button>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {t('auth.enterCodeTitle', { defaultValue: 'Check your email' })}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t('auth.sentCodeTo', { defaultValue: 'We sent a 6-digit verification code to' })}{' '}
                <strong className="text-slate-900 font-semibold">{maskedEmail || email}</strong>
              </p>

              {successMessage && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                {/* OTP Input */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label">
                      {t('auth.verificationCode', { defaultValue: '6-Digit Verification Code' })}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs text-slate-400">Valid for 15 mins</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 582194"
                      className="input pl-10 font-mono tracking-widest text-lg font-bold"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="label">
                    {t('auth.newPassword', { defaultValue: 'New Password' })}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="input px-10"
                      autoComplete="new-password"
                      required
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

                {/* Confirm New Password */}
                <div>
                  <label className="label">
                    {t('auth.confirmNewPassword', { defaultValue: 'Confirm New Password' })}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="input px-10"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 shadow-sm font-semibold"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {loading
                    ? t('common.buttons.resettingPassword', { defaultValue: 'Resetting Password...' })
                    : t('common.buttons.resetPassword', { defaultValue: 'Reset Password' })}
                </button>
              </form>

              {/* Resend Code Section */}
              <div className="mt-6 pt-4 border-t border-slate-200 text-center text-sm text-slate-500">
                {t('auth.didntReceiveCode', { defaultValue: "Didn't receive the code?" })}{' '}
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    {t('auth.resendCode', { defaultValue: 'Resend Code' })}
                  </button>
                ) : (
                  <span className="text-slate-400">
                    {t('auth.resendIn', { defaultValue: 'Resend in' })} {resendCooldown}s
                  </span>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 'SUCCESS' && (
            <div className="text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm border border-emerald-200">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
                {t('auth.passwordResetSuccessTitle', { defaultValue: 'Password Reset Successfully!' })}
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                {t('auth.passwordResetSuccessDesc', {
                  defaultValue:
                    'Your password has been changed securely. You can now use your new password to sign in to AquaShield.',
                })}
              </p>

              <div className="mt-8">
                <button
                  onClick={() => navigate('/')}
                  className="btn-primary w-full py-2.5 shadow-sm font-semibold"
                >
                  {t('common.buttons.signInNow', { defaultValue: 'Sign In to Your Account' })}
                </button>
              </div>

              <p className="mt-6 text-xs text-slate-400">
                AquaShield AI &bull; Automated Disease Surveillance &amp; Early Warning System
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
