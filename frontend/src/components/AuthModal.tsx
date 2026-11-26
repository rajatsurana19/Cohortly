import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, AlertCircle, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

interface AuthModalProps {
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode = 'login', onSuccess }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<{ fullName?: boolean; email?: boolean; password?: boolean }>({});

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMsg(null);
  }, [initialMode]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const fullNameValid = fullName.trim().length >= 2;
  const passwordValid = mode === 'login' ? password.length >= 1 : password.length >= 8;

  const getRedirectRoute = (role: string, serverRedirect?: string) => {
    if (serverRedirect) return serverRedirect;
    if (role === 'PROFESSOR') return '/professor';
    if (role === 'PLATFORM_ADMIN') return '/admin';
    return '/student';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true });
    setError(null);

    if ((mode === 'register' && !fullNameValid) || !emailValid || !passwordValid) {
      setError('Please fix the highlighted fields before continuing.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const payload =
        mode === 'register'
          ? { fullName: fullName.trim(), email: email.trim(), password }
          : { email: email.trim(), password };

      const res = await api.post(endpoint, payload);

      if (res.data?.success) {
        const { accessToken, user, redirectTo } = res.data.data;
        setSuccessMsg(mode === 'register' ? 'Account created. Redirecting...' : 'Signed in. Redirecting...');
        login(accessToken, user);
        if (onSuccess) onSuccess();
        navigate(getRedirectRoute(user.role, redirectTo), { replace: true });
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Authentication failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setMode('login');
    setError(null);
  };

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-md p-6 sm:p-8 max-w-md w-full mx-auto text-left animate-fade-slide-up">
      {/* Mode switcher tabs */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
            setTouched({});
          }}
          className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg text-center transition-all duration-200 ${
            mode === 'login'
              ? 'bg-surface text-primary shadow-xs'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError(null);
            setTouched({});
          }}
          className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg text-center transition-all duration-200 ${
            mode === 'register'
              ? 'bg-surface text-primary shadow-xs'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" />
            <span>Student Sign Up</span>
          </div>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-danger flex items-start gap-2 animate-fade-slide-up">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2 animate-scale-pop">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {mode === 'register' && (
          <div className="animate-fade-slide-up">
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                touched.fullName && !fullNameValid
                  ? 'border-red-400 focus:ring-red-200 focus:border-red-500'
                  : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
            />
            {touched.fullName && !fullNameValid && (
              <p className="mt-1 text-[11px] text-danger">Full name must be at least 2 characters.</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.edu"
            className={`w-full px-3.5 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${
              touched.email && !emailValid
                ? 'border-red-400 focus:ring-red-200 focus:border-red-500'
                : 'border-border focus:ring-primary/20 focus:border-primary'
            }`}
          />
          {touched.email && !emailValid && (
            <p className="mt-1 text-[11px] text-danger">Please enter a valid email address.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={mode === 'register' ? 8 : 1}
              value={password}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter your password'}
              className={`w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                touched.password && !passwordValid
                  ? 'border-red-400 focus:ring-red-200 focus:border-red-500'
                  : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {touched.password && !passwordValid && (
            <p className="mt-1 text-[11px] text-danger">
              {mode === 'register' ? 'Password must be at least 8 characters.' : 'Password is required.'}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{mode === 'register' ? 'Creating account...' : 'Signing in...'}</span>
            </>
          ) : (
            <span>{mode === 'register' ? 'Create Student Account' : 'Sign In'}</span>
          )}
        </button>
      </form>

      {/* Quick Demo Login Helpers */}
      <div className="mt-7 pt-5 border-t border-border">
        <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2.5">
          Quick Demo Accounts
        </div>
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <button
            type="button"
            onClick={() => handleQuickDemo('admin@cohortly.edu', 'CohortlyAdmin2026!')}
            className="p-2.5 text-left rounded-lg border border-border hover:border-primary/40 hover:bg-primary-light/30 transition-all"
          >
            <div className="font-semibold text-text-primary">Admin</div>
            <div className="text-[11px] text-text-muted truncate">admin@cohortly.edu</div>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setFullName('Sample Student');
              setEmail(`student_${Math.floor(Math.random() * 9000 + 1000)}@cohortly.edu`);
              setPassword('StudentPass123!');
              setError(null);
            }}
            className="p-2.5 text-left rounded-lg border border-border hover:border-primary/40 hover:bg-primary-light/30 transition-all"
          >
            <div className="font-semibold text-text-primary">New Student</div>
            <div className="text-[11px] text-text-muted">Generate & Register</div>
          </button>
        </div>
      </div>
    </div>
  );
};
