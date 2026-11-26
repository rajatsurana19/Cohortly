import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { StudentDashboard } from './components/StudentDashboard';
import { ProfessorDashboard } from './components/ProfessorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Users, BookOpen, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react';

const LandingAuthPage: React.FC = () => {
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

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
          <div className="lg:col-span-7 text-left space-y-6 animate-fade-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-surface shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-text-primary">Academic Group Formation & Submission Integrity</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-text-primary leading-tight">
              Structured Classroom Collaboration and Accountability
            </h1>

            <p className="text-base text-text-secondary leading-relaxed max-w-xl">
              Cohortly replaces disorganized chats and spreadsheets with formal classroom workflows. Manage individual and group assignments, real-time submission progress, and leader acknowledgments.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
                <div className="w-8 h-8 rounded-md bg-blue-50 text-primary flex items-center justify-center mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-text-primary mb-1">Group Integrity</h4>
                <p className="text-[11px] text-text-secondary">
                  Enforced 1 group creation per student per class with leader accountability.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
                <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-text-primary mb-1">Course Workspaces</h4>
                <p className="text-[11px] text-text-secondary">
                  Dedicated assignment pages with clear deadlines and progress tracking.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
                <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-text-primary mb-1">Leader Acknowledgment</h4>
                <p className="text-[11px] text-text-secondary">
                  Group leader acknowledgment reflects instantly across every group member.
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

const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-background flex flex-col justify-between">
    <Navbar />
    <main className="flex-1 w-full pb-16">{children}</main>
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

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-text-secondary">Loading Cohortly workspace...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LandingAuthPage />} />
        <Route path="*" element={<LandingAuthPage />} />
      </Routes>
    );
  }

  const defaultRoute =
    user.role === 'PLATFORM_ADMIN' ? '/admin' : user.role === 'PROFESSOR' ? '/professor' : '/student';

  return (
    <AuthenticatedLayout>
      <Routes>
        {user.role === 'STUDENT' && (
          <>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/courses/:classId" element={<StudentDashboard />} />
          </>
        )}
        {user.role === 'PROFESSOR' && (
          <>
            <Route path="/professor" element={<ProfessorDashboard />} />
            <Route path="/professor/courses/:classId" element={<ProfessorDashboard />} />
          </>
        )}
        {user.role === 'PLATFORM_ADMIN' && (
          <Route path="/admin" element={<AdminDashboard />} />
        )}
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </AuthenticatedLayout>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
