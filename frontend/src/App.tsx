import React, { useState, useEffect } from 'react';
import { Users, BookOpen, CheckCircle, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import api from './services/api';

interface HealthData {
  status: string;
  app: string;
  database: string;
}

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await api.get('/health');
        if (res.data?.success) {
          setHealth(res.data.data);
        }
      } catch (err: any) {
        setError(err.message || 'Could not connect to Cohortly backend');
      } finally {
        setLoading(false);
      }
    };

    checkBackend();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-border bg-surface px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl shadow">
              C
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-text-primary">Cohortly</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Academic Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="#login"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign In
            </a>
            <a
              href="#register"
              className="text-sm font-medium px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white transition-colors shadow-sm"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full flex flex-col items-center justify-center text-center">
        {/* System Health Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-surface shadow-sm">
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span className="text-text-secondary">Checking API & Database status...</span>
            </>
          ) : health ? (
            <>
              <span className="w-2 h-2 rounded-full bg-success"></span>
              <span className="text-text-primary font-semibold">{health.app}</span>
              <span className="text-text-secondary">| {health.database}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-danger"></span>
              <span className="text-danger font-medium">Backend Offline ({error || 'Retrying'})</span>
            </>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-primary max-w-3xl mb-4 leading-tight">
          Structured Academic Group Formation & Assignment Accountability
        </h1>

        <p className="text-base md:text-lg text-text-secondary max-w-2xl mb-8 leading-relaxed">
          Google Classroom-style academic workspace. Enforce 1-group-per-class integrity, invitation workflows, assignment targeting, and individual member participation confirmations.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <a
            href="#register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary hover:bg-primary-hover text-white font-medium shadow transition-colors"
          >
            <span>Student Registration</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#login"
            className="px-6 py-3 rounded-md bg-surface border border-border hover:bg-gray-50 text-text-primary font-medium shadow-sm transition-colors"
          >
            Professor & Admin Login
          </a>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left max-w-5xl">
          <div className="p-6 rounded-lg border border-border bg-surface shadow-sm">
            <div className="w-10 h-10 rounded-md bg-blue-50 text-primary flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-2">Group Formation Integrity</h3>
            <p className="text-sm text-text-secondary leading-normal">
              Database-enforced 1 group creation per student per class, permanent creator retention, atomic transactions, and invitation acceptance.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-surface shadow-sm">
            <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-2">Targeted Assignments</h3>
            <p className="text-sm text-text-secondary leading-normal">
              Target all eligible groups or specific teams. Publication freezes assignment group scope with accurate historical records.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-surface shadow-sm">
            <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-2">Individual Confirmation</h3>
            <p className="text-sm text-text-secondary leading-normal">
              Distinguishes team submission records from each member's personal participation confirmation. Full accountability.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-text-secondary gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Cohortly &copy; {new Date().getFullYear()} — Academic Group Management</span>
          </div>
          <div className="flex gap-4">
            <span>React + Tailwind</span>
            <span>•</span>
            <span>Node.js + Express</span>
            <span>•</span>
            <span>PostgreSQL (Supabase)</span>
            <span>•</span>
            <span>Docker</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
