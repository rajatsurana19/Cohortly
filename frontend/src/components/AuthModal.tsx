import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

interface AuthModalProps {
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode = 'login', onSuccess }) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await api.post('/auth/register', {
          fullName,
          email,
          password,
        });

        if (res.data?.success) {
          const { accessToken, user } = res.data.data;
          login(accessToken, user);
          if (onSuccess) onSuccess();
        }
      } else {
        const res = await api.post('/auth/login', {
          email,
          password,
        });

        if (res.data?.success) {
          const { accessToken, user } = res.data.data;
          login(accessToken, user);
          if (onSuccess) onSuccess();
        }
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
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm p-6 sm:p-8 max-w-md w-full mx-auto text-left">
      {/* Mode switcher tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors ${
            mode === 'login'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </div>
        </button>

        <button
          onClick={() => {
            setMode('register');
            setError(null);
          }}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors ${
            mode === 'register'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" />
            <span>Student Registration</span>
          </div>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-danger flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full px-3 py-2 text-sm rounded-md border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.edu"
            className="w-full px-3 py-2 text-sm rounded-md border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">
            Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full px-3 py-2 text-sm rounded-md border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-md bg-primary hover:bg-primary-hover text-white text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{mode === 'register' ? 'Create Student Account' : 'Sign In'}</span>
        </button>
      </form>

      {/* Quick Demo Login Helpers */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
          Quick Demo Accounts
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickDemo('admin@cohortly.edu', 'CohortlyAdmin2026!')}
            className="p-2 text-left rounded border border-border hover:bg-gray-50 transition"
          >
            <div className="font-semibold text-text-primary">Admin</div>
            <div className="text-[11px] text-text-muted">admin@cohortly.edu</div>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setFullName('Sample Student');
              setEmail(`student_${Math.floor(Math.random() * 9000 + 1000)}@cohortly.edu`);
              setPassword('StudentPass123!');
            }}
            className="p-2 text-left rounded border border-border hover:bg-gray-50 transition"
          >
            <div className="font-semibold text-text-primary">New Student</div>
            <div className="text-[11px] text-text-muted">Generate & Register</div>
          </button>
        </div>
      </div>
    </div>
  );
};
