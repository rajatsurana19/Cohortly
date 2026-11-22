import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Plus,
  ArrowRight,
  Shield,
  Trash2,
  AlertCircle,
  Check,
  X,
  Clock,
  Send,
  Eye,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import api from '../services/api';
import { ClassItem, StudentGroup, Assignment, Course, AcademicYear } from '../types';

export const ProfessorDashboard: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'groups' | 'assignments'>('groups');
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

  // Professor Intervention Modal
  const [showInterveneModal, setShowInterveneModal] = useState<boolean>(false);
  const [interveningGroup, setInterveningGroup] = useState<StudentGroup | null>(null);
  const [interventionAction, setInterventionAction] = useState<'CHANGE_LEADER' | 'REMOVE_MEMBER' | 'DISBAND_GROUP'>('CHANGE_LEADER');
  const [targetMemberId, setTargetMemberId] = useState<string>('');
  const [interventionReason, setInterventionReason] = useState<string>('');

  // Create Assignment Modal
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState<boolean>(false);
  const [assignTitle, setAssignTitle] = useState<string>('');
  const [assignDesc, setAssignDesc] = useState<string>('');
  const [assignInstructions, setAssignInstructions] = useState<string>('');
  const [assignTargetMode, setAssignTargetMode] = useState<'ALL_GROUPS' | 'SELECTED_GROUPS'>('ALL_GROUPS');
  const [assignSelectedGroups, setAssignSelectedGroups] = useState<string[]>([]);
  const [assignDueDate, setAssignDueDate] = useState<string>('');

  // Assignment Submissions & Confirmation Modal
  const [selectedAssignmentForDetails, setSelectedAssignmentForDetails] = useState<Assignment | null>(null);
  const [showWaiveModal, setShowWaiveModal] = useState<boolean>(false);
  const [waivingConfirmationId, setWaivingConfirmationId] = useState<string>('');
  const [waiverReason, setWaiverReason] = useState<string>('');

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
        if (courseRes.data.data.courses.length > 0) {
          setNewClassCourseId(courseRes.data.data.courses[0].id);
        }
      }
      if (yearRes.data?.success) {
        setAcademicYears(yearRes.data.data.academicYears);
        if (yearRes.data.data.academicYears.length > 0) {
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

  const fetchClassDetails = async (classId: string) => {
    try {
      setLoading(true);
      setError(null);
      const [classRes, groupsRes, assignRes] = await Promise.all([
        api.get(`/classes/${classId}`),
        api.get(`/classes/${classId}/groups`),
        api.get(`/classes/${classId}/assignments`),
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
        setSuccessMsg('Classroom created successfully');
        await fetchInitialData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interveningGroup) return;
    setError(null);

    try {
      const res = await api.post(`/groups/${interveningGroup.id}/intervene`, {
        action: interventionAction,
        targetMemberId: targetMemberId || undefined,
        reason: interventionReason,
      });

      if (res.data?.success) {
        setShowInterveneModal(false);
        setInterveningGroup(null);
        setInterventionReason('');
        setSuccessMsg('Intervention executed and logged to audit trail');
        if (selectedClass) await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setError(null);

    try {
      const res = await api.post(`/classes/${selectedClass.id}/assignments`, {
        title: assignTitle,
        description: assignDesc,
        instructions: assignInstructions,
        targetMode: assignTargetMode,
        selectedGroupIds: assignTargetMode === 'SELECTED_GROUPS' ? assignSelectedGroups : [],
        dueAt: assignDueDate ? new Date(assignDueDate).toISOString() : null,
      });

      if (res.data?.success) {
        setShowCreateAssignmentModal(false);
        setAssignTitle('');
        setAssignDesc('');
        setAssignInstructions('');
        setAssignDueDate('');
        setAssignSelectedGroups([]);
        setSuccessMsg('Assignment created in DRAFT status');
        await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handlePublishAssignment = async (assignmentId: string) => {
    if (!window.confirm('Publishing will snapshot targeted groups and notify enrolled students. Proceed?')) {
      return;
    }
    setError(null);
    try {
      const res = await api.post(`/assignments/${assignmentId}/publish`);
      if (res.data?.success) {
        setSuccessMsg('Assignment published. Target group scope frozen.');
        if (selectedClass) await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleCloseAssignment = async (assignmentId: string) => {
    if (!window.confirm('Close assignment and reject any further submissions?')) return;
    setError(null);
    try {
      const res = await api.post(`/assignments/${assignmentId}/close`);
      if (res.data?.success) {
        setSuccessMsg('Assignment closed');
        if (selectedClass) await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleWaiveConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post(`/confirmations/${waivingConfirmationId}/waive`, {
        reason: waiverReason,
      });
      if (res.data?.success) {
        setShowWaiveModal(false);
        setWaiverReason('');
        setSuccessMsg('Member confirmation successfully waived');
        if (selectedClass) await fetchClassDetails(selectedClass.id);
        if (selectedAssignmentForDetails) {
          const updated = await api.get(`/assignments/${selectedAssignmentForDetails.id}`);
          if (updated.data?.success) setSelectedAssignmentForDetails(updated.data.data.assignment);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClass) return;
    if (!window.confirm('Remove student from classroom? Enrollment history will be preserved.')) return;
    setError(null);
    try {
      const res = await api.delete(`/classes/${selectedClass.id}/enrollments/${studentId}`);
      if (res.data?.success) {
        setSuccessMsg('Student removed from classroom');
        await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-left">
      {/* Alert Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-danger flex items-center justify-between">
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
        <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-800 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {selectedClass ? selectedClass.name : 'Professor Dashboard'}
          </h1>
          <p className="text-sm text-text-secondary">
            {selectedClass
              ? `${selectedClass.course?.name} (${selectedClass.course?.code}) • Join Code: ${selectedClass.join_code}`
              : 'Classroom management, student group oversight, and assignment accountability'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedClass ? (
            <button
              onClick={() => {
                setSelectedClass(null);
                setSelectedAssignmentForDetails(null);
              }}
              className="px-3.5 py-2 text-xs font-semibold rounded-md border border-border bg-surface hover:bg-gray-50 text-text-primary transition"
            >
              Back to Classrooms
            </button>
          ) : (
            <button
              onClick={() => setShowCreateClassModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Classroom</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!selectedClass ? (
        /* Managed Classrooms Grid */
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-4">Assigned Classrooms</h2>
          {loading ? (
            <div className="p-12 text-center text-sm text-text-secondary">Loading classrooms...</div>
          ) : classes.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-xl bg-surface">
              <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <h3 className="text-base font-semibold text-text-primary mb-1">No classrooms assigned yet</h3>
              <p className="text-xs text-text-secondary mb-4">
                Create a classroom to publish assignments and monitor student groups.
              </p>
              <button
                onClick={() => setShowCreateClassModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Classroom</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedClass(c);
                    fetchClassDetails(c.id);
                  }}
                  className="group p-6 rounded-xl border border-border bg-surface shadow-xs hover:shadow-md hover:border-primary/50 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded bg-blue-50 border border-blue-100">
                        {c.course?.code || 'COURSE'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 text-text-secondary border border-gray-200">
                        <KeyRound className="w-3 h-3 text-text-muted" />
                        {c.join_code}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-text-primary mb-1 group-hover:text-primary transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-xs text-text-secondary mb-4">
                      {c.course?.name} • Year {c.academic_year?.name}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                    <div className="flex items-center gap-3">
                      <span>{c._count?.enrollments || 0} Students</span>
                      <span>•</span>
                      <span>{c._count?.groups || 0} Groups</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Inside Selected Classroom */
        <div>
          {/* Class Navigation Tabs */}
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setActiveTab('groups')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'groups'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Groups ({groups.length})</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('assignments')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'assignments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Assignments ({assignments.length})</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'students'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                <span>Enrolled Students ({selectedClass.enrollments?.length || 0})</span>
              </div>
            </button>
          </div>

          {/* TAB: GROUPS */}
          {activeTab === 'groups' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gray-50 border border-border text-xs text-text-secondary flex items-center justify-between">
                <span>
                  Professors can intervene in group leadership or membership when necessary. All interventions require a mandatory reason and are logged to audit history.
                </span>
                <span className="font-mono text-xs font-bold text-text-primary">
                  Join Code: {selectedClass.join_code}
                </span>
              </div>

              {groups.length === 0 ? (
                <div className="p-12 text-center text-sm text-text-secondary border border-dashed border-border rounded-xl bg-surface">
                  No groups formed in this classroom yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map((g) => (
                    <div key={g.id} className="p-5 rounded-lg border border-border bg-surface shadow-xs">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-base font-bold text-text-primary">{g.name}</h4>
                          <p className="text-xs text-text-secondary">{g.description || 'No description'}</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-text-secondary">
                          {g.memberships.length} Members
                        </span>
                      </div>

                      {/* Members list */}
                      <div className="my-3 space-y-1.5">
                        {g.memberships.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-gray-50 text-xs"
                          >
                            <span className="font-medium text-text-primary">{m.student.full_name}</span>
                            <div className="flex items-center gap-2">
                              {m.membership_role === 'LEADER' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  LEADER
                                </span>
                              )}
                              <span className="text-[11px] text-text-muted">{m.student.email}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-text-muted">Status: {g.status}</span>
                        <button
                          onClick={() => {
                            setInterveningGroup(g);
                            setShowInterveneModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md border border-border bg-surface hover:bg-gray-50 text-text-primary shadow-xs transition"
                        >
                          <Shield className="w-3.5 h-3.5 text-primary" />
                          <span>Intervene</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-text-primary">Assignments & Submissions</h3>
                <button
                  onClick={() => setShowCreateAssignmentModal(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Assignment</span>
                </button>
              </div>

              {assignments.length === 0 ? (
                <div className="p-12 text-center text-sm text-text-secondary border border-dashed border-border rounded-xl bg-surface">
                  No assignments created in this classroom yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="p-6 rounded-xl border border-border bg-surface shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="max-w-2xl">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              a.status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : a.status === 'DRAFT'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {a.status}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-primary">
                            {a.target_mode === 'ALL_GROUPS' ? 'All Groups' : 'Selected Groups'}
                          </span>
                          {a.due_at && (
                            <span className="text-xs text-text-muted flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Due: {new Date(a.due_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-text-primary mb-1">{a.title}</h4>
                        <p className="text-xs text-text-secondary line-clamp-2">
                          {a.description || a.instructions || 'No description'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {a.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePublishAssignment(a.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Publish</span>
                          </button>
                        )}

                        {a.status === 'PUBLISHED' && (
                          <button
                            onClick={() => handleCloseAssignment(a.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface hover:bg-gray-50 text-text-secondary text-xs font-semibold shadow-xs transition"
                          >
                            Close Submissions
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            const res = await api.get(`/assignments/${a.id}`);
                            if (res.data?.success) {
                              setSelectedAssignmentForDetails(res.data.data.assignment);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface hover:bg-gray-50 text-text-primary text-xs font-semibold shadow-xs transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span>View Submissions</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Assignment Submissions & Confirmation Modal */}
              {selectedAssignmentForDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                  <div className="bg-surface rounded-xl border border-border shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-left">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gray-50/50">
                      <div>
                        <h3 className="text-base font-bold text-text-primary">
                          {selectedAssignmentForDetails.title} — Submissions
                        </h3>
                        <p className="text-xs text-text-secondary">
                          Monitor group submissions and individual member participation confirmations
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedAssignmentForDetails(null)}
                        className="p-1 rounded-md text-text-muted hover:text-text-primary"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {selectedAssignmentForDetails.submissions &&
                      selectedAssignmentForDetails.submissions.length > 0 ? (
                        selectedAssignmentForDetails.submissions.map((sub) => (
                          <div key={sub.id} className="p-4 rounded-lg border border-border bg-surface space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-bold text-text-primary">
                                Group Submission: {sub.submitter?.full_name}
                              </h5>
                              <span className="text-xs text-text-muted">
                                {new Date(sub.submitted_at).toLocaleString()}
                              </span>
                            </div>

                            {sub.submission_reference && (
                              <p className="text-xs text-text-secondary font-mono bg-gray-50 p-2 rounded border border-border">
                                Reference: {sub.submission_reference}
                              </p>
                            )}

                            {/* Individual Confirmations List */}
                            <div>
                              <h6 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                                Member Confirmations
                              </h6>
                              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                                {sub.confirmations.map((conf) => (
                                  <div
                                    key={conf.id}
                                    className="p-3 bg-surface flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <span className="font-semibold text-text-primary">
                                        {conf.student?.full_name}
                                      </span>
                                      <span className="text-text-muted ml-2">({conf.student?.email})</span>
                                      {conf.waiver_reason && (
                                        <p className="text-[11px] text-purple-700 mt-0.5">
                                          Waiver Reason: {conf.waiver_reason}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          conf.status === 'CONFIRMED'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : conf.status === 'WAIVED'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {conf.status}
                                      </span>

                                      {conf.status === 'PENDING' && (
                                        <button
                                          onClick={() => {
                                            setWaivingConfirmationId(conf.id);
                                            setShowWaiveModal(true);
                                          }}
                                          className="px-2 py-1 text-[11px] font-semibold rounded border border-border hover:bg-gray-50 text-text-secondary"
                                        >
                                          Waive
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-sm text-text-secondary">
                          No submissions recorded yet for this assignment.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: STUDENTS */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gray-50 border border-border flex items-center justify-between text-xs">
                <span className="text-text-secondary">
                  Students enrolled in this classroom can form or join groups and submit assignments.
                </span>
                <span className="font-mono font-bold text-text-primary">Join Code: {selectedClass.join_code}</span>
              </div>

              <div className="border border-border rounded-lg overflow-hidden bg-surface">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-border text-text-secondary font-semibold">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Enrolled At</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedClass.enrollments?.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-semibold text-text-primary">{e.student?.full_name}</td>
                        <td className="p-3 text-text-secondary">{e.student?.email}</td>
                        <td className="p-3 text-text-muted">{new Date(e.enrolled_at).toLocaleDateString()}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleRemoveStudent(e.student_id)}
                            className="text-danger hover:text-red-700 font-semibold inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Create Classroom */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">Create Classroom</h3>
              <button onClick={() => setShowCreateClassModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Classroom Name</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Operating Systems - Section B"
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Course</label>
                <select
                  required
                  value={newClassCourseId}
                  onChange={(e) => setNewClassCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {courses.map((crs) => (
                    <option key={crs.id} value={crs.id}>
                      {crs.name} ({crs.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Academic Year</label>
                <select
                  required
                  value={newClassYearId}
                  onChange={(e) => setNewClassYearId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {academicYears.map((yr) => (
                    <option key={yr.id} value={yr.id}>
                      {yr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Section (Optional)</label>
                <input
                  type="text"
                  value={newClassSection}
                  onChange={(e) => setNewClassSection(e.target.value)}
                  placeholder="e.g. TY-A"
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Professor Intervention */}
      {showInterveneModal && interveningGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">
                Intervene in Group: {interveningGroup.name}
              </h3>
              <button onClick={() => setShowInterveneModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleIntervention} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Intervention Action</label>
                <select
                  value={interventionAction}
                  onChange={(e: any) => setInterventionAction(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="CHANGE_LEADER">Transfer / Appoint New Leader</option>
                  <option value="REMOVE_MEMBER">Remove Member from Group</option>
                  <option value="DISBAND_GROUP">Disband Group Completely</option>
                </select>
              </div>

              {interventionAction !== 'DISBAND_GROUP' && (
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Target Member</label>
                  <select
                    required
                    value={targetMemberId}
                    onChange={(e) => setTargetMemberId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select a member...</option>
                    {interveningGroup.memberships.map((m) => (
                      <option key={m.student_id} value={m.student_id}>
                        {m.student.full_name} ({m.membership_role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Reason for Intervention (Required for Audit Log)
                </label>
                <textarea
                  required
                  rows={3}
                  value={interventionReason}
                  onChange={(e) => setInterventionReason(e.target.value)}
                  placeholder="State the academic justification for this intervention..."
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInterveneModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-danger hover:bg-red-700 text-white shadow-xs"
                >
                  Execute Intervention
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Assignment */}
      {showCreateAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-lg w-full p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">Create Classroom Assignment</h3>
              <button onClick={() => setShowCreateAssignmentModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="e.g. Distributed Database Architecture Project"
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Description</label>
                <textarea
                  rows={2}
                  value={assignDesc}
                  onChange={(e) => setAssignDesc(e.target.value)}
                  placeholder="High-level description of objectives..."
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Target Mode</label>
                <select
                  value={assignTargetMode}
                  onChange={(e: any) => setAssignTargetMode(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="ALL_GROUPS">All Active Groups in Classroom</option>
                  <option value="SELECTED_GROUPS">Selected Groups Only</option>
                </select>
                <p className="text-[11px] text-text-muted mt-1">
                  Publication freezes targeted groups to protect scope integrity.
                </p>
              </div>

              {assignTargetMode === 'SELECTED_GROUPS' && (
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Select Groups</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-border p-2 rounded-md">
                    {groups.map((g) => (
                      <label key={g.id} className="flex items-center gap-2 text-xs text-text-primary">
                        <input
                          type="checkbox"
                          checked={assignSelectedGroups.includes(g.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignSelectedGroups([...assignSelectedGroups, g.id]);
                            } else {
                              setAssignSelectedGroups(assignSelectedGroups.filter((id) => id !== g.id));
                            }
                          }}
                        />
                        <span>{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAssignmentModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Waive Confirmation */}
      {showWaiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-sm w-full p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">Waive Confirmation</h3>
              <button onClick={() => setShowWaiveModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleWaiveConfirmation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Waiver Reason (Required for Audit Log)
                </label>
                <textarea
                  required
                  rows={3}
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  placeholder="e.g. Medical leave approved by department head..."
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWaiveModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-purple-700 hover:bg-purple-800 text-white shadow-xs"
                >
                  Confirm Waiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
