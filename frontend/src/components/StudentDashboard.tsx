import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  ArrowRight,
  AlertCircle,
  Check,
  X,
  KeyRound,
  School,
  Users,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import api from '../services/api';
import { ClassItem, GroupInvitation } from '../types';
import { ProgressBar } from './ProgressBar';
import { CourseAssignmentsPage } from './CourseAssignmentsPage';

export const StudentDashboard: React.FC = () => {
  const { classId } = useParams<{ classId?: string }>();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [myInvitations, setMyInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Join Class modal state
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [joinCode, setJoinCode] = useState<string>('');
  const [joining, setJoining] = useState<boolean>(false);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/classes');
      if (res.data?.success) {
        setClasses(res.data.data.classes);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyInvitations = async () => {
    try {
      const res = await api.get('/invitations/my');
      if (res.data?.success) {
        setMyInvitations(res.data.data.invitations);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchMyInvitations();
  }, []);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setJoining(true);
    try {
      const res = await api.post('/classes/join', { joinCode: joinCode.trim() });
      if (res.data?.success) {
        setShowJoinModal(false);
        setJoinCode('');
        setSuccessMsg('Successfully enrolled in course.');
        await fetchClasses();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleRespondInvitation = async (invitationId: string, action: 'accept' | 'reject') => {
    setError(null);
    try {
      const res = await api.post(`/invitations/${invitationId}/${action}`);
      if (res.data?.success) {
        setSuccessMsg(`Invitation ${action}ed successfully.`);
        await fetchMyInvitations();
        await fetchClasses();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  // If a course route (/student/courses/:classId) is active, show dedicated Course Assignment Page
  if (classId) {
    const selectedClass = classes.find((c) => c.id === classId);
    if (loading && !selectedClass) {
      return (
        <div className="py-20 flex flex-col items-center justify-center text-text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-sm">Loading course workspace...</p>
        </div>
      );
    }
    if (!selectedClass) {
      return (
        <div className="max-w-3xl mx-auto px-6 py-16 text-center animate-fade-slide-up">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <h2 className="text-lg font-bold text-text-primary">Course not found</h2>
          <p className="text-sm text-text-secondary mt-1 mb-6">
            You may not be enrolled in this course or it no longer exists.
          </p>
          <button
            onClick={() => navigate('/student')}
            className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition"
          >
            Back to Enrolled Courses
          </button>
        </div>
      );
    }
    return <CourseAssignmentsPage classItem={selectedClass} onRefreshClasses={fetchClasses} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-left animate-fade-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">My Enrolled Courses</h1>
          <p className="text-sm text-text-secondary mt-1">
            Select a course card to open its assignments, submission progress, and group workspace.
          </p>
        </div>
        <button
          onClick={() => setShowJoinModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition active:scale-[0.99] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Join Course via Code</span>
        </button>
      </div>

      {/* Status Alerts */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-danger flex items-center justify-between animate-fade-slide-up">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-danger hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between animate-scale-pop">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-800 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Group Invitations Banner */}
      {myInvitations.length > 0 && (
        <div className="mb-8 bg-blue-50/70 border border-blue-200 rounded-2xl p-5 animate-fade-slide-up">
          <div className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <span>Pending Group Invitations ({myInvitations.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myInvitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-surface rounded-xl border border-blue-200 p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-bold text-text-primary">{inv.group.name}</div>
                  <div className="text-xs text-text-secondary">
                    {inv.group.class?.course?.code} • Invited by {inv.inviter.full_name}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRespondInvitation(inv.id, 'accept')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleRespondInvitation(inv.id, 'reject')}
                    className="px-3 py-1.5 rounded-lg border border-border hover:bg-gray-50 text-text-secondary text-xs font-semibold transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responsive Course Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-sm">Loading your enrolled courses...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center shadow-xs">
          <School className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h3 className="text-lg font-bold text-text-primary">No Enrolled Courses Yet</h3>
          <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
            Ask your professor for a classroom join code to enroll and start accessing assignments.
          </p>
          <button
            onClick={() => setShowJoinModal(true)}
            className="mt-5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold inline-flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Join Your First Course</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => {
            const totalPublished = cls.analytics?.totalPublished ?? cls._count?.assignments ?? 0;
            const completedCount = cls.analytics?.completedCount ?? 0;
            const progressPercent = cls.analytics?.progressPercent ?? 0;

            return (
              <div
                key={cls.id}
                onClick={() => navigate(`/student/courses/${cls.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/student/courses/${cls.id}`);
                }}
                className="group bg-surface rounded-2xl border border-border p-6 shadow-xs hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-light text-primary border border-blue-200">
                      {cls.course.code}
                    </span>
                    <span className="text-[11px] font-medium text-text-secondary">
                      {cls.academic_year.name}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
                    {cls.course.name}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {cls.name} {cls.section ? `• Section ${cls.section}` : ''}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-xs text-text-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                      {cls.professors.map((p) => p.professor.full_name).join(', ') || 'Instructor'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-text-muted" />
                      {totalPublished} assignments
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border space-y-3">
                  <ProgressBar
                    percent={progressPercent}
                    label="Assignments"
                    sublabel={`${completedCount}/${totalPublished}`}
                    status={progressPercent === 100 && totalPublished > 0 ? 'ACKNOWLEDGED' : 'SUBMITTED'}
                    showBadge={false}
                  />
                  <div className="flex items-center justify-between text-xs font-semibold text-primary">
                    <span>Open Assignments</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join Course Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-xl max-w-md w-full p-6 animate-scale-pop">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-text-primary">Join a Course</h3>
              </div>
              <button onClick={() => setShowJoinModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Enter the classroom join code provided by your professor.
            </p>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Join Code
                </label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3D4"
                  className="w-full px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                  {joining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enroll Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
