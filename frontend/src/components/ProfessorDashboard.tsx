import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Plus,
  ArrowRight,
  Shield,
  AlertCircle,
  Check,
  X,
  Clock,
  Send,
  Eye,
  KeyRound,
  ChevronRight,
  BarChart3,
  Edit3,
  CheckCircle2,
  Loader2,
  FileText,
  Filter,
} from 'lucide-react';
import api from '../services/api';
import { ClassItem, StudentGroup, Assignment, Course, AcademicYear } from '../types';
import { ProgressBar } from './ProgressBar';

interface SubmissionMonitorItem {
  type: 'INDIVIDUAL' | 'GROUP';
  status: 'PENDING' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'OVERDUE';
  student?: { id: string; full_name: string; email: string };
  group?: { id: string; name: string; memberships: any[] };
  submission: any | null;
}

export const ProfessorDashboard: React.FC = () => {
  const { classId } = useParams<{ classId?: string }>();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'groups' | 'students'>('assignments');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create Classroom Modal
  const [showCreateClassModal, setShowCreateClassModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassCourseId, setNewClassCourseId] = useState<string>('');
  const [newClassYearId, setNewClassYearId] = useState<string>('');
  const [newClassSection, setNewClassSection] = useState<string>('');

  // Classroom details
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Create / Edit Assignment Modal
  const [showAssignmentModal, setShowAssignmentModal] = useState<boolean>(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignTitle, setAssignTitle] = useState<string>('');
  const [assignDesc, setAssignDesc] = useState<string>('');
  const [assignInstructions, setAssignInstructions] = useState<string>('');
  const [assignSubmissionType, setAssignSubmissionType] = useState<'GROUP' | 'INDIVIDUAL'>('GROUP');
  const [assignMaxScore, setAssignMaxScore] = useState<number>(100);
  const [assignTargetMode, setAssignTargetMode] = useState<'ALL_GROUPS' | 'SELECTED_GROUPS'>('ALL_GROUPS');
  const [assignSelectedGroups, setAssignSelectedGroups] = useState<string[]>([]);
  const [assignDueDate, setAssignDueDate] = useState<string>('');
  const [savingAssignment, setSavingAssignment] = useState<boolean>(false);

  // Submission Monitor Modal
  const [monitoringAssignment, setMonitoringAssignment] = useState<Assignment | null>(null);
  const [monitorItems, setMonitorItems] = useState<SubmissionMonitorItem[]>([]);
  const [monitorStatusFilter, setMonitorStatusFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'OVERDUE'>('ALL');
  const [loadingMonitor, setLoadingMonitor] = useState<boolean>(false);

  // Professor Intervention Modal
  const [showInterveneModal, setShowInterveneModal] = useState<boolean>(false);
  const [interveningGroup, setInterveningGroup] = useState<StudentGroup | null>(null);
  const [interventionAction, setInterventionAction] = useState<'CHANGE_LEADER' | 'REMOVE_MEMBER' | 'DISBAND_GROUP'>('CHANGE_LEADER');
  const [targetMemberId, setTargetMemberId] = useState<string>('');
  const [interventionReason, setInterventionReason] = useState<string>('');

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [classRes, courseRes, yearRes] = await Promise.all([
        api.get('/classes'),
        api.get('/courses'),
        api.get('/academic-years'),
      ]);

      if (classRes.data?.success) setClasses(classRes.data.data.classes);
      if (courseRes.data?.success) {
        setCourses(courseRes.data.data.courses);
        if (courseRes.data.data.courses.length > 0 && !newClassCourseId) {
          setNewClassCourseId(courseRes.data.data.courses[0].id);
        }
      }
      if (yearRes.data?.success) {
        setAcademicYears(yearRes.data.data.academicYears);
        if (yearRes.data.data.academicYears.length > 0 && !newClassYearId) {
          setNewClassYearId(yearRes.data.data.academicYears[0].id);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchClassDetails = async (targetClassId: string) => {
    try {
      setLoading(true);
      setError(null);
      const [classRes, groupsRes, assignRes] = await Promise.all([
        api.get(`/classes/${targetClassId}`),
        api.get(`/classes/${targetClassId}/groups`),
        api.get(`/classes/${targetClassId}/assignments`),
      ]);

      if (classRes.data?.success) setSelectedClass(classRes.data.data.class);
      if (groupsRes.data?.success) setGroups(groupsRes.data.data.groups);
      if (assignRes.data?.success) setAssignments(assignRes.data.data.assignments);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchClassDetails(classId);
    } else {
      setSelectedClass(null);
    }
  }, [classId]);

  const fetchMonitorSubmissions = async (
    assignment: Assignment,
    status: 'ALL' | 'PENDING' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'OVERDUE'
  ) => {
    setMonitoringAssignment(assignment);
    setMonitorStatusFilter(status);
    setLoadingMonitor(true);
    try {
      const query = status === 'ALL' ? '' : `?status=${status}`;
      const res = await api.get(`/assignments/${assignment.id}/submissions${query}`);
      if (res.data?.success) {
        setMonitorItems(res.data.data.items);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoadingMonitor(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/classes', {
        name: newClassName,
        courseId: newClassCourseId,
        academicYearId: newClassYearId,
        section: newClassSection,
      });

      if (res.data?.success) {
        setShowCreateClassModal(false);
        setNewClassName('');
        setNewClassSection('');
        setSuccessMsg('Classroom created successfully.');
        await fetchInitialData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const openCreateAssignment = () => {
    setEditingAssignment(null);
    setAssignTitle('');
    setAssignDesc('');
    setAssignInstructions('');
    setAssignSubmissionType('GROUP');
    setAssignMaxScore(100);
    setAssignTargetMode('ALL_GROUPS');
    setAssignSelectedGroups([]);
    setAssignDueDate('');
    setShowAssignmentModal(true);
  };

  const openEditAssignment = (a: Assignment) => {
    setEditingAssignment(a);
    setAssignTitle(a.title);
    setAssignDesc(a.description || '');
    setAssignInstructions(a.instructions || '');
    setAssignSubmissionType(a.submission_type || 'GROUP');
    setAssignMaxScore(a.max_score || 100);
    setAssignTargetMode(a.target_mode);
    setAssignSelectedGroups(a.assignment_groups?.map((ag) => ag.group.id) || []);
    setAssignDueDate(a.due_at ? new Date(a.due_at).toISOString().slice(0, 16) : '');
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setError(null);
    setSavingAssignment(true);
    try {
      const payload = {
        title: assignTitle.trim(),
        description: assignDesc.trim() || undefined,
        instructions: assignInstructions.trim() || undefined,
        submissionType: assignSubmissionType,
        maxScore: assignMaxScore,
        targetMode: assignSubmissionType === 'INDIVIDUAL' ? 'ALL_GROUPS' : assignTargetMode,
        selectedGroupIds: assignSelectedGroups,
        dueAt: assignDueDate ? new Date(assignDueDate).toISOString() : null,
      };

      if (editingAssignment) {
        const res = await api.patch(`/assignments/${editingAssignment.id}`, payload);
        if (res.data?.success) {
          setShowAssignmentModal(false);
          setSuccessMsg('Assignment updated successfully.');
          await fetchClassDetails(selectedClass.id);
        }
      } else {
        const res = await api.post(`/classes/${selectedClass.id}/assignments`, payload);
        if (res.data?.success) {
          setShowAssignmentModal(false);
          setSuccessMsg('Draft assignment created.');
          await fetchClassDetails(selectedClass.id);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSavingAssignment(false);
    }
  };

  const handlePublishAssignment = async (assignmentId: string) => {
    if (!selectedClass) return;
    setError(null);
    try {
      const res = await api.post(`/assignments/${assignmentId}/publish`);
      if (res.data?.success) {
        setSuccessMsg('Assignment published to students.');
        await fetchClassDetails(selectedClass.id);
        await fetchInitialData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleCloseAssignment = async (assignmentId: string) => {
    if (!selectedClass) return;
    setError(null);
    try {
      const res = await api.post(`/assignments/${assignmentId}/close`);
      if (res.data?.success) {
        setSuccessMsg('Assignment closed.');
        await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interveningGroup || !selectedClass) return;
    setError(null);
    try {
      const res = await api.post(`/groups/${interveningGroup.id}/professor-intervene`, {
        action: interventionAction,
        targetStudentId: targetMemberId || undefined,
        reason: interventionReason,
      });

      if (res.data?.success) {
        setShowInterveneModal(false);
        setInterventionReason('');
        setSuccessMsg('Intervention recorded and executed.');
        await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  // Course Detail View (/professor/courses/:classId)
  if (classId) {
    if (loading && !selectedClass) {
      return (
        <div className="py-20 flex flex-col items-center justify-center text-text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-sm">Loading classroom management...</p>
        </div>
      );
    }

    if (!selectedClass) {
      return (
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <h2 className="text-lg font-bold text-text-primary">Classroom not found</h2>
          <button
            onClick={() => navigate('/professor')}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold"
          >
            Back to Courses
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-left animate-fade-slide-up">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-medium text-text-secondary mb-6">
          <button
            onClick={() => navigate('/professor')}
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Courses</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-primary font-semibold">
            {selectedClass.course.code} — {selectedClass.name}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-primary font-semibold capitalize">{activeTab}</span>
        </nav>

        {/* Header Banner */}
        <div className="bg-surface rounded-2xl border border-border p-6 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-light text-primary border border-blue-200">
                {selectedClass.course.code}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-gray-100 text-text-primary">
                <KeyRound className="w-3 h-3 text-primary" />
                Join Code: {selectedClass.join_code}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{selectedClass.course.name}</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {selectedClass.name} • {selectedClass.enrollments?.length ?? selectedClass._count?.enrollments ?? 0} Students • {groups.length} Active Groups
            </p>
          </div>
          <button
            onClick={openCreateAssignment}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-danger flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between animate-scale-pop">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-6 gap-2">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'assignments'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Assignments ({assignments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'groups'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Groups ({groups.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'students'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Enrolled Students ({selectedClass.enrollments?.length || 0})</span>
          </button>
        </div>

        {/* ASSIGNMENTS TAB */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-border p-12 text-center">
                <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <h3 className="text-base font-bold text-text-primary">No assignments created yet</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Create an Individual or Group assignment to track student progress.
                </p>
                <button
                  onClick={openCreateAssignment}
                  className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Assignment</span>
                </button>
              </div>
            ) : (
              assignments.map((a) => {
                const isGroup = a.submission_type !== 'INDIVIDUAL';
                const totalTarget = isGroup
                  ? a.target_mode === 'ALL_GROUPS'
                    ? groups.length
                    : a.assignment_groups?.length || 0
                  : selectedClass.enrollments?.length || 0;
                const submittedCount = isGroup
                  ? a.submissions?.length ?? a._count?.submissions ?? 0
                  : a.individual_submissions?.length ?? a._count?.individual_submissions ?? 0;
                const acknowledgedCount = isGroup
                  ? a.submissions?.filter((s) => s.is_acknowledged).length ?? 0
                  : a.individual_submissions?.filter((s) => s.is_acknowledged).length ?? 0;
                const pct = totalTarget > 0 ? Math.round((acknowledgedCount / totalTarget) * 100) : 0;

                return (
                  <div
                    key={a.id}
                    className="bg-surface rounded-2xl border border-border p-6 shadow-xs hover:border-blue-200 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              a.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : a.status === 'CLOSED'
                                ? 'bg-gray-100 text-text-secondary border-border'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {a.status}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isGroup
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            {isGroup ? 'GROUP' : 'INDIVIDUAL'}
                          </span>
                          {a.due_at && (
                            <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                              <Clock className="w-3.5 h-3.5" />
                              Due {new Date(a.due_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-text-primary">{a.title}</h3>
                        {a.description && <p className="text-sm text-text-secondary">{a.description}</p>}

                        {a.status !== 'DRAFT' && (
                          <div className="pt-2 max-w-lg">
                            <ProgressBar
                              percent={pct}
                              label="Acknowledged Progress"
                              sublabel={`${acknowledgedCount} ack / ${submittedCount} sub / ${totalTarget} total`}
                              status={pct === 100 && totalTarget > 0 ? 'ACKNOWLEDGED' : 'SUBMITTED'}
                              showBadge={false}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEditAssignment(a)}
                          className="px-3 py-2 rounded-lg border border-border hover:bg-gray-50 text-xs font-semibold text-text-primary flex items-center gap-1.5 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {a.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePublishAssignment(a.id)}
                            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Publish</span>
                          </button>
                        )}

                        {a.status === 'PUBLISHED' && (
                          <button
                            onClick={() => handleCloseAssignment(a.id)}
                            className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition"
                          >
                            Close
                          </button>
                        )}

                        {a.status !== 'DRAFT' && (
                          <button
                            onClick={() => fetchMonitorSubmissions(a, 'ALL')}
                            className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Monitor Submissions</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="bg-surface rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-text-primary">{g.name}</h4>
                    <span className="text-xs font-medium text-text-secondary">
                      {g.memberships.length}/{g.max_members}
                    </span>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    {g.memberships.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs">
                        <span className="text-text-primary">{m.student.full_name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.membership_role === 'LEADER'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-text-secondary'
                          }`}
                        >
                          {m.membership_role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setInterveningGroup(g);
                    setShowInterveneModal(true);
                  }}
                  className="mt-4 w-full py-2 rounded-lg border border-border hover:bg-gray-50 text-xs font-semibold text-text-secondary flex items-center justify-center gap-1.5 transition"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Intervene</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-border text-text-secondary uppercase">
                <tr>
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Enrolled At</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(selectedClass.enrollments || []).map((enr) => (
                  <tr key={enr.id} className="hover:bg-gray-50/70">
                    <td className="px-5 py-3 font-semibold text-text-primary">{enr.student?.full_name}</td>
                    <td className="px-5 py-3 text-text-secondary">{enr.student?.email}</td>
                    <td className="px-5 py-3 text-text-secondary">{new Date(enr.enrolled_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        {enr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create / Edit Assignment Modal */}
        {showAssignmentModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl border border-border shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-scale-pop">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-text-primary">
                  {editingAssignment ? 'Edit Assignment' : 'Create Assignment'}
                </h3>
                <button onClick={() => setShowAssignmentModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveAssignment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Assignment Title</label>
                  <input
                    type="text"
                    required
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder="e.g. Distributed Systems Lab 2"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Submission Type</label>
                    <select
                      value={assignSubmissionType}
                      onChange={(e) => setAssignSubmissionType(e.target.value as 'GROUP' | 'INDIVIDUAL')}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="GROUP">Group Assignment</option>
                      <option value="INDIVIDUAL">Individual Assignment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Max Score</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={assignMaxScore}
                      onChange={(e) => setAssignMaxScore(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={assignDesc}
                    onChange={(e) => setAssignDesc(e.target.value)}
                    placeholder="Brief overview of the assignment..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Instructions</label>
                  <textarea
                    rows={3}
                    value={assignInstructions}
                    onChange={(e) => setAssignInstructions(e.target.value)}
                    placeholder="Deliverables, rubric, or submission format..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Deadline</label>
                  <input
                    type="datetime-local"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {assignSubmissionType === 'GROUP' && (
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Target Groups</label>
                    <select
                      value={assignTargetMode}
                      onChange={(e) => setAssignTargetMode(e.target.value as 'ALL_GROUPS' | 'SELECTED_GROUPS')}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
                    >
                      <option value="ALL_GROUPS">All Active Groups</option>
                      <option value="SELECTED_GROUPS">Selected Groups Only</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignmentModal(false)}
                    className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAssignment}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-60"
                  >
                    {savingAssignment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingAssignment ? 'Save Changes' : 'Save Draft'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Monitor Submissions Modal with Status Filters */}
        {monitoringAssignment && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl border border-border shadow-xl max-w-3xl w-full p-6 max-h-[90vh] flex flex-col animate-scale-pop">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    Submissions: {monitoringAssignment.title}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {monitoringAssignment.submission_type === 'INDIVIDUAL'
                      ? 'Individual Student Submissions'
                      : 'Group Submissions & Leader Acknowledgments'}
                  </p>
                </div>
                <button
                  onClick={() => setMonitoringAssignment(null)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Filter className="w-3.5 h-3.5 text-text-muted mr-1" />
                {(['ALL', 'PENDING', 'SUBMITTED', 'ACKNOWLEDGED', 'OVERDUE'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => fetchMonitorSubmissions(monitoringAssignment, status)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                      monitorStatusFilter === status
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
                {loadingMonitor ? (
                  <div className="py-12 flex flex-col items-center justify-center text-text-secondary">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                    <span className="text-xs">Loading submission records...</span>
                  </div>
                ) : monitorItems.length === 0 ? (
                  <div className="py-10 text-center text-sm text-text-secondary">
                    No submissions match the selected status filter.
                  </div>
                ) : (
                  monitorItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-border bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-text-primary">
                          {item.type === 'INDIVIDUAL' ? item.student?.full_name : item.group?.name}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {item.type === 'INDIVIDUAL'
                            ? item.student?.email
                            : `${item.group?.memberships?.length || 0} members`}
                        </div>
                        {item.submission && (
                          <div className="text-[11px] text-text-secondary mt-1">
                            Submitted {new Date(item.submission.submitted_at).toLocaleString()}
                            {item.submission.submission_reference && (
                              <a
                                href={item.submission.submission_reference}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-primary font-semibold hover:underline"
                              >
                                Reference Link
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold self-start sm:self-center ${
                          item.status === 'ACKNOWLEDGED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'SUBMITTED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : item.status === 'OVERDUE'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Professor Intervention Modal */}
        {showInterveneModal && interveningGroup && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl border border-border shadow-xl max-w-md w-full p-6 animate-scale-pop">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-text-primary">
                  Intervene: {interveningGroup.name}
                </h3>
                <button onClick={() => setShowInterveneModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleIntervention} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Action</label>
                  <select
                    value={interventionAction}
                    onChange={(e) => setInterventionAction(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
                  >
                    <option value="CHANGE_LEADER">Transfer Leadership</option>
                    <option value="REMOVE_MEMBER">Remove Member</option>
                    <option value="DISBAND_GROUP">Disband Group</option>
                  </select>
                </div>
                {interventionAction !== 'DISBAND_GROUP' && (
                  <div>
                    <label className="block text-xs font-semibold mb-1">Target Member</label>
                    <select
                      required
                      value={targetMemberId}
                      onChange={(e) => setTargetMemberId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
                    >
                      <option value="">Select member...</option>
                      {interveningGroup.memberships.map((m) => (
                        <option key={m.student_id} value={m.student_id}>
                          {m.student.full_name} ({m.membership_role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold mb-1">Audit Reason</label>
                  <textarea
                    required
                    minLength={5}
                    rows={2}
                    value={interventionReason}
                    onChange={(e) => setInterventionReason(e.target.value)}
                    placeholder="Reason for administrative intervention..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInterveneModal(false)}
                    className="px-4 py-2 rounded-lg border border-border text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold"
                  >
                    Execute
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Professor Courses Overview (/professor)
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-left animate-fade-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Courses & Analytics</h1>
          <p className="text-sm text-text-secondary mt-1">
            Monitor enrolled students, submission progress, and manage course assignments.
          </p>
        </div>
        <button
          onClick={() => setShowCreateClassModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Classroom</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-danger flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between animate-scale-pop">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-sm">Loading courses & analytics...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center">
          <BookOpen className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h3 className="text-lg font-bold text-text-primary">No Assigned Courses Yet</h3>
          <p className="text-sm text-text-secondary mt-1">
            Create a classroom to invite students and publish assignments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => {
            const studentCount = cls.analytics?.studentCount ?? cls._count?.enrollments ?? 0;
            const groupCount = cls.analytics?.groupCount ?? cls._count?.groups ?? 0;
            const publishedCount = cls.analytics?.publishedAssignments ?? 0;
            const submittedCount = cls.analytics?.submittedCount ?? 0;
            const acknowledgedCount = cls.analytics?.acknowledgedCount ?? 0;
            const ackRate = submittedCount > 0 ? Math.round((acknowledgedCount / submittedCount) * 100) : 0;

            return (
              <div
                key={cls.id}
                onClick={() => navigate(`/professor/courses/${cls.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/professor/courses/${cls.id}`);
                }}
                className="group bg-surface rounded-2xl border border-border p-6 shadow-xs hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-light text-primary border border-blue-200">
                      {cls.course.code}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-text-secondary">
                      Code: {cls.join_code}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
                    {cls.course.name}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {cls.name} {cls.section ? `• Section ${cls.section}` : ''}
                  </p>

                  {/* Basic Analytics Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-xl bg-gray-50 border border-border text-center">
                    <div>
                      <div className="text-base font-bold text-text-primary">{studentCount}</div>
                      <div className="text-[10px] text-text-secondary font-medium">Students</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-text-primary">{groupCount}</div>
                      <div className="text-[10px] text-text-secondary font-medium">Groups</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-text-primary">{publishedCount}</div>
                      <div className="text-[10px] text-text-secondary font-medium">Published</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border space-y-3">
                  <ProgressBar
                    percent={ackRate}
                    label="Submission Ack Rate"
                    sublabel={`${acknowledgedCount}/${submittedCount}`}
                    status={ackRate === 100 && submittedCount > 0 ? 'ACKNOWLEDGED' : 'SUBMITTED'}
                    showBadge={false}
                  />
                  <div className="flex items-center justify-between text-xs font-semibold text-primary">
                    <span className="inline-flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Manage & Monitor
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Classroom Modal */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-xl max-w-md w-full p-6 animate-scale-pop">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Create Classroom</h3>
              <button onClick={() => setShowCreateClassModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Course</label>
                <select
                  required
                  value={newClassCourseId}
                  onChange={(e) => setNewClassCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Academic Year</label>
                <select
                  required
                  value={newClassYearId}
                  onChange={(e) => setNewClassYearId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Classroom Name</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Fall 2026 Cohort"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Section (Optional)</label>
                <input
                  type="text"
                  value={newClassSection}
                  onChange={(e) => setNewClassSection(e.target.value)}
                  placeholder="e.g. A"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
