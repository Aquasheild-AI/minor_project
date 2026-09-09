import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { useAuth, type RegisterData } from '@/hooks/useAuth';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.username || !form.password) {
      setError('Username and password are required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const regData: RegisterData = {
        username: form.username,
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        role: 'COMMUNITY', // Always Community — backend enforces this too
        phone: form.phone || undefined,
      };
      await register(regData);
      navigate('/community/home', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
            <p className="text-lg font-bold">Surveillance &amp; Early Warning</p>
            <p className="text-sm text-primary-200">Water-Borne Disease Monitoring System</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Join the Disease Surveillance Network
          </h1>
          <p className="mt-4 text-primary-200">
            Register as a Community User to access water quality data, risk alerts,
            and report health issues in your village.
          </p>
          <p className="mt-8 text-lg font-medium text-white">
            Together, we protect communities.
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

      {/* Right panel - register form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <p className="font-bold text-slate-900">Surveillance &amp; Early Warning</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
          <p className="mt-1 text-sm text-slate-500">
            Register as a Community User to access the surveillance system.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={set('first_name')}
                  placeholder="First name"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={set('last_name')}
                  placeholder="Last name"
                  className="input"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="label">Username *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={form.username}
                  onChange={set('username')}
                  placeholder="Choose a username"
                  className="input pl-10"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="name@example.com"
                  className="input pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="label">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="+91 98765 43210"
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
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

            {/* Confirm Password */}
            <div>
              <label className="label">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder="Repeat your password"
                  className="input pl-10"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account…' : 'Create Community Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/" className="font-semibold text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-slate-400">
            Authority and Health Worker accounts are created by administrators.
          </p>
        </div>
      </div>
    </div>
  );
}
