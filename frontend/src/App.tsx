import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { StudentDashboard } from './components/StudentDashboard';
import { ProfessorDashboard } from './components/ProfessorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Users, BookOpen, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-text-secondary">Loading Cohortly workspace...</p>
      </div>
    );
  }

  // If user is authenticated, render role-specific dashboard
  if (user) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <Navbar />
        <main className="flex-1 w-full pb-16">
          {user.role === 'PLATFORM_ADMIN' && <AdminDashboard />}
          {user.role === 'PROFESSOR' && <ProfessorDashboard />}
          {user.role === 'STUDENT' && <StudentDashboard />}
        </main>
        <footer className="border-t border-border bg-surface py-5 px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-text-secondary gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Cohortly &copy; {new Date().getFullYear()} — Academic Group Formation & Accountability</span>
            </div>
            <div className="flex gap-4">
              <span>PostgreSQL / Supabase</span>
              <span>•</span>
              <span>Express Modular Monolith</span>
              <span>•</span>
              <span>React & Tailwind CSS</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // If unauthenticated, show landing presentation and login / registration form
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-border bg-surface px-6 py-4 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl shadow-xs">
              C
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-text-primary">Cohortly</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Academic Management
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAuthModalMode('login')}
              className="text-xs font-semibold px-3.5 py-2 rounded-md border border-border bg-surface hover:bg-gray-50 text-text-primary transition"
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthModalMode('register')}
              className="text-xs font-semibold px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs transition"
            >
              Student Registration
            </button>
          </div>
        </div>
      </header>

      {/* Main Landing & Interactive Form */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full flex flex-col items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full max-w-6xl my-auto">
          {/* Left Column: Product Information */}
          <div className="lg:col-span-7 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-surface shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-text-primary">Academic Group Formation & Submission Integrity</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-text-primary leading-tight">
              Structured Classroom Collaboration and Accountability
            </h1>

            <p className="text-base text-text-secondary leading-relaxed max-w-xl">
              Cohortly replaces disorganized WhatsApp groups and shared sheets with formal classroom workflows. Enforce 1-group-per-class limits, invitation acceptance, assignment target snapshots, and individual member confirmation.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-lg border border-border bg-surface shadow-xs">
                <div className="w-8 h-8 rounded-md bg-blue-50 text-primary flex items-center justify-center mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-text-primary mb-1">Group Integrity</h4>
                <p className="text-[11px] text-text-secondary">
                  Database-enforced 1 group creation per student per class permanently.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-surface shadow-xs">
                <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-text-primary mb-1">Frozen Targets</h4>
                <p className="text-[11px] text-text-secondary">
                  Assignment publication locks targeted groups to protect assignment scope.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-surface shadow-xs">
                <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-text-primary mb-1">Confirmations</h4>
                <p className="text-[11px] text-text-secondary">
                  Independent member confirmation prevents free-riding on submissions.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login / Register Form */}
          <div className="lg:col-span-5 w-full">
            <AuthModal initialMode={authModalMode} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-text-secondary gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Cohortly &copy; {new Date().getFullYear()} — Academic Platform</span>
          </div>
          <div className="flex gap-4">
            <span>React & Tailwind CSS</span>
            <span>•</span>
            <span>Node.js + Express</span>
            <span>•</span>
            <span>PostgreSQL (Supabase)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
};

export default App;
