import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, Eye, EyeOff, ShieldCheck, UserCog, HeartPulse, Users } from 'lucide-react';
import { useAuth, type UserRole } from '@/hooks/useAuth';

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin / Authority',
  worker: 'Health Worker',
  community: 'Community User',
};

const roleAccessText: Record<UserRole, string> = {
  admin: 'Authorized Administrator Access',
  worker: 'Authorized Health Worker Access',
  community: 'Authorized Community Access',
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('community');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      login(role);
      setLoading(false);
      navigate(role === 'admin' ? '/dashboard' : role === 'worker' ? '/worker/dashboard' : '/community/home');
    }, 600);
  };

  const roleButtons: { key: UserRole; icon: React.ElementType; label: string; desc: string }[] = [
    { key: 'community', icon: Users, label: 'Community User', desc: 'View risk & report' },
    { key: 'worker', icon: HeartPulse, label: 'Health Worker', desc: 'Field operations' },
    { key: 'admin', icon: UserCog, label: 'Admin / Authority', desc: 'System management' },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left panel */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-primary-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold">Surveillance & Early Warning</p>
            <p className="text-sm text-primary-200">Water-Borne Disease Monitoring System</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Smart AI-Driven Water-Borne Disease Surveillance
          </h1>
          <p className="mt-4 text-primary-200">
            A comprehensive monitoring platform for rural community health, water quality analysis,
            and ML-driven disease risk prediction.
          </p>
          <p className="mt-8 text-lg font-medium text-white">
            Early detection. Better decisions. Safer communities.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-primary-300">
          <ShieldCheck className="h-4 w-4" />
          Government of India — Public Health Initiative
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-1/3 h-64 w-64 rounded-full bg-primary-400 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-primary-500 blur-3xl" />
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <p className="font-bold text-slate-900">Surveillance & Early Warning</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Sign in to your account</h2>
          <p className="mt-1 text-sm text-slate-500">Access the disease surveillance system.</p>

          {/* Role selector */}
          <div className="mt-6">
            <label className="label">Select Role</label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {roleButtons.map((r) => {
                const Icon = r.icon;
                const active = role === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                      active
                        ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-500/20'
                        : 'border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? 'bg-primary-600' : 'bg-slate-100'}`}>
                      <Icon className={active ? 'text-white' : 'text-slate-500'} style={{ width: 18, height: 18 }} />
                    </div>
                    <p className={`text-xs font-semibold ${active ? 'text-primary-700' : 'text-slate-700'}`}>{r.label}</p>
                    <p className="text-[10px] text-slate-400">{r.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@health.gov.in"
                  className="input pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
                Remember me
              </label>
              <button type="button" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-risk-critical-bg px-3 py-2 text-sm text-risk-critical">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : `Sign In as ${roleLabels[role]}`}
            </button>
          </form>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
            <Lock className="h-3 w-3" />
            {roleAccessText[role]}
          </p>
        </div>
      </div>
    </div>
  );
}
