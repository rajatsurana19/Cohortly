import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  CheckCircle,
  Plus,
  ArrowRight,
  LogOut,
  Send,
  UserCheck,
  AlertCircle,
  Clock,
  Check,
  X,
  FileText,
  KeyRound,
  ShieldAlert,
  School,
} from 'lucide-react';
import api from '../services/api';
import { ClassItem, StudentGroup, Assignment, MemberConfirmation, GroupInvitation } from '../types';

export const StudentDashboard: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'assignments' | 'confirmations' | 'invitations'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Join Class modal state
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [joinCode, setJoinCode] = useState<string>('');

  // Groups state
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [userHasCreatedGroup, setUserHasCreatedGroup] = useState<boolean>(false);
  const [currentActiveGroup, setCurrentActiveGroup] = useState<StudentGroup | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupDesc, setNewGroupDesc] = useState<string>('');
  const [newGroupMaxMembers, setNewGroupMaxMembers] = useState<number>(5);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');

  // Assignments state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [submittingAssignment, setSubmittingAssignment] = useState<Assignment | null>(null);
  const [submissionReference, setSubmissionReference] = useState<string>('');
  const [submissionNotes, setSubmissionNotes] = useState<string>('');

  // Confirmations state
  const [confirmations, setConfirmations] = useState<MemberConfirmation[]>([]);

  // Pending invitations state
  const [myInvitations, setMyInvitations] = useState<GroupInvitation[]>([]);

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
    } catch (e) {
      // ignore
    }
  };

  const fetchMyConfirmations = async () => {
    try {
      const res = await api.get('/confirmations/my');
      if (res.data?.success) {
        setConfirmations(res.data.data.confirmations);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchMyInvitations();
    fetchMyConfirmations();
  }, []);

  const fetchClassDetails = async (classId: string) => {
    try {
      setLoading(true);
      setError(null);
      const [groupsRes, assignRes] = await Promise.all([
        api.get(`/classes/${classId}/groups`),
        api.get(`/classes/${classId}/assignments`),
      ]);

      if (groupsRes.data?.success) {
        setGroups(groupsRes.data.data.groups);
        setUserHasCreatedGroup(groupsRes.data.data.userHasCreatedGroup);
        setCurrentActiveGroup(groupsRes.data.data.currentActiveGroup);
      }

      if (assignRes.data?.success) {
        setAssignments(assignRes.data.data.assignments);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = (c: ClassItem) => {
    setSelectedClass(c);
    setActiveTab('groups');
    fetchClassDetails(c.id);
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/classes/join', { joinCode });
      if (res.data?.success) {
        setShowJoinModal(false);
        setJoinCode('');
        setSuccessMsg('Successfully enrolled in classroom');
        await fetchClasses();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setError(null);
    try {
      const res = await api.post(`/classes/${selectedClass.id}/groups`, {
        name: newGroupName,
        description: newGroupDesc,
        maxMembers: newGroupMaxMembers,
      });

      if (res.data?.success) {
        setShowCreateGroupModal(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setSuccessMsg('Group created successfully');
        await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentActiveGroup) return;
    setError(null);
    try {
      const res = await api.post(`/groups/${currentActiveGroup.id}/invitations`, {
        studentEmail: inviteEmail,
      });
      if (res.data?.success) {
        setShowInviteModal(false);
        setInviteEmail('');
        setSuccessMsg('Invitation sent to classmate');
        if (selectedClass) await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleAcceptInvite = async (invitationId: string) => {
    setError(null);
    try {
      const res = await api.post(`/invitations/${invitationId}/accept`);
      if (res.data?.success) {
        setSuccessMsg('Joined group successfully');
        await fetchMyInvitations();
        if (selectedClass) await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleRejectInvite = async (invitationId: string) => {
    setError(null);
    try {
      const res = await api.post(`/invitations/${invitationId}/reject`);
      if (res.data?.success) {
        setSuccessMsg('Invitation declined');
        await fetchMyInvitations();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleConfirmParticipation = async (confirmationId: string) => {
    setError(null);
    try {
      const res = await api.post(`/confirmations/${confirmationId}/confirm`);
      if (res.data?.success) {
        setSuccessMsg('Participation confirmed successfully');
        await fetchMyConfirmations();
        if (selectedClass) await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentActiveGroup) return;
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    setError(null);
    try {
      const res = await api.post(`/groups/${currentActiveGroup.id}/leave`, {
        reason: 'Student left group',
      });
      if (res.data?.success) {
        setSuccessMsg('You have left the group');
        if (selectedClass) await fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment || !currentActiveGroup) return;
    setError(null);
    try {
      const res = await api.post(
        `/assignments/${submittingAssignment.id}/groups/${currentActiveGroup.id}/submissions`,
        {
          submissionReference,
          notes: submissionNotes,
        }
      );
      if (res.data?.success) {
        setShowSubmitModal(false);
        setSubmissionReference('');
        setSubmissionNotes('');
        setSuccessMsg('Submission recorded. Member confirmations are pending.');
        if (selectedClass) await fetchClassDetails(selectedClass.id);
        await fetchMyConfirmations();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-left">
      {/* Banner Messages */}
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

      {/* Breadcrumb / Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {selectedClass ? selectedClass.name : 'Student Workspace'}
          </h1>
          <p className="text-sm text-text-secondary">
            {selectedClass
              ? `${selectedClass.course?.name} (${selectedClass.course?.code}) • Section ${selectedClass.section || 'General'}`
              : 'Enrolled classrooms, group collaborations, and individual confirmations'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedClass ? (
            <button
              onClick={() => setSelectedClass(null)}
              className="px-3.5 py-2 text-xs font-semibold rounded-md border border-border bg-surface hover:bg-gray-50 text-text-primary transition"
            >
              Back to All Classes
            </button>
          ) : (
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs transition"
            >
              <KeyRound className="w-4 h-4" />
              <span>Join Classroom</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedClass ? (
        /* Classrooms Overview List */
        <div className="space-y-8">
          {/* Quick Pending Alerts Bar */}
          {(myInvitations.length > 0 || confirmations.filter((c) => c.status === 'PENDING').length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myInvitations.length > 0 && (
                <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">
                        {myInvitations.length} Pending Group Invitation{myInvitations.length > 1 ? 's' : ''}
                      </h4>
                      <p className="text-xs text-text-secondary">Review teams waiting for your acceptance</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (classes.length > 0) setSelectedClass(classes[0]);
                      setActiveTab('invitations');
                    }}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    View
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {confirmations.filter((c) => c.status === 'PENDING').length > 0 && (
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">
                        {confirmations.filter((c) => c.status === 'PENDING').length} Submission Confirmation Required
                      </h4>
                      <p className="text-xs text-text-secondary">Confirm your participation for team submissions</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (classes.length > 0) setSelectedClass(classes[0]);
                      setActiveTab('confirmations');
                    }}
                    className="text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1"
                  >
                    Confirm Now
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Enrolled Classes Grid */}
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-4">My Enrolled Classrooms</h2>
            {loading ? (
              <div className="p-12 text-center text-sm text-text-secondary">Loading classrooms...</div>
            ) : classes.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border rounded-xl bg-surface">
                <School className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <h3 className="text-base font-semibold text-text-primary mb-1">No enrolled classrooms yet</h3>
                <p className="text-xs text-text-secondary mb-4">
                  Join a classroom using the join code provided by your professor.
                </p>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs transition"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Enter Join Code</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectClass(c)}
                    className="group p-6 rounded-xl border border-border bg-surface shadow-xs hover:shadow-md hover:border-primary/50 transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded bg-blue-50 border border-blue-100">
                          {c.course?.code || 'COURSE'}
                        </span>
                        <span className="text-xs font-semibold text-text-muted">
                          {c._count?.groups || 0} Groups
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-text-primary mb-1 group-hover:text-primary transition-colors">
                        {c.name}
                      </h3>
                      <p className="text-xs text-text-secondary line-clamp-2 mb-4">
                        {c.course?.name} • Academic Year {c.academic_year?.name}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-text-muted" />
                        <span>
                          {c.professors?.[0]?.professor?.full_name || 'Prof. Unassigned'}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Inside Selected Classroom */
        <div>
          {/* Navigation Tabs */}
          <div className="flex border-b border-border mb-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('groups')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
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
              className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
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
              onClick={() => setActiveTab('confirmations')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'confirmations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>My Confirmations ({confirmations.length})</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('invitations')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'invitations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span>Invitations ({myInvitations.length})</span>
              </div>
            </button>
          </div>

          {/* TAB 1: GROUPS */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              {/* Active Group Banner if User is in a Group */}
              {currentActiveGroup ? (
                <div className="p-6 rounded-xl border border-blue-200 bg-blue-50/40 shadow-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-white mb-1.5">
                        Your Active Group
                      </div>
                      <h3 className="text-xl font-bold text-text-primary">{currentActiveGroup.name}</h3>
                      <p className="text-xs text-text-secondary">
                        {currentActiveGroup.description || 'No description provided'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Invite Classmate
                      </button>
                      <button
                        onClick={handleLeaveGroup}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 bg-white hover:bg-red-50 text-danger text-xs font-semibold shadow-xs transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Leave Group
                      </button>
                    </div>
                  </div>

                  {/* Members list */}
                  <div className="mt-4 pt-4 border-t border-blue-100">
                    <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                      Team Members
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {groups
                        .find((g) => g.id === currentActiveGroup.id)
                        ?.memberships.map((m) => (
                          <div
                            key={m.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs"
                          >
                            <span className="font-semibold text-text-primary">{m.student.full_name}</span>
                            {m.membership_role === 'LEADER' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                LEADER
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Not in group: show Create Group or Explanations */
                <div className="p-6 rounded-xl border border-border bg-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-text-primary mb-1">Group Formation</h3>
                    <p className="text-xs text-text-secondary max-w-xl">
                      Students can create at most 1 group per class permanently. If you already created a group in this class, the restriction remains even after leaving or disbanding.
                    </p>
                  </div>

                  {userHasCreatedGroup ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-gray-100 border border-gray-200 text-xs font-medium text-text-secondary">
                      <ShieldAlert className="w-4 h-4 text-text-muted" />
                      <span>Group creation limit reached (1 per class)</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCreateGroupModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Group</span>
                    </button>
                  )}
                </div>
              )}

              {/* All Classroom Groups Grid */}
              <div>
                <h3 className="text-base font-bold text-text-primary mb-3">All Groups in Classroom</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((g) => (
                    <div key={g.id} className="p-5 rounded-lg border border-border bg-surface shadow-xs">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-bold text-text-primary">{g.name}</h4>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-text-secondary">
                          {g.memberships.length} / {g.max_members || 5}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-2 mb-4">
                        {g.description || 'No description'}
                      </p>
                      <div className="text-[11px] text-text-muted border-t border-border pt-3 flex items-center justify-between">
                        <span>Created by {g.creator?.full_name}</span>
                        <span className="font-semibold text-text-secondary">{g.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              {assignments.length === 0 ? (
                <div className="p-12 text-center text-sm text-text-secondary border border-dashed border-border rounded-xl bg-surface">
                  No published assignments in this classroom.
                </div>
              ) : (
                assignments.map((a) => {
                  const isSubmitted = a.submissions && a.submissions.length > 0;
                  return (
                    <div
                      key={a.id}
                      className="p-6 rounded-xl border border-border bg-surface shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="max-w-2xl">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-primary border border-blue-100">
                            {a.target_mode === 'ALL_GROUPS' ? 'All Groups' : 'Selected Groups'}
                          </span>
                          {a.due_at && (
                            <span className="text-xs text-text-muted flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Due: {new Date(a.due_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-text-primary mb-1">{a.title}</h3>
                        <p className="text-xs text-text-secondary leading-relaxed mb-2">
                          {a.description || a.instructions || 'No details provided'}
                        </p>
                      </div>

                      <div>
                        {isSubmitted ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                            <Check className="w-4 h-4" />
                            Submitted
                          </div>
                        ) : currentActiveGroup ? (
                          <button
                            onClick={() => {
                              setSubmittingAssignment(a);
                              setShowSubmitModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Submit for Group</span>
                          </button>
                        ) : (
                          <span className="text-xs text-text-muted">Must be in a group to submit</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: CONFIRMATIONS */}
          {activeTab === 'confirmations' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gray-50 border border-border text-xs text-text-secondary">
                Each member of a team must confirm their individual participation for group submissions. One member's confirmation never confirms another automatically.
              </div>

              {confirmations.length === 0 ? (
                <div className="p-12 text-center text-sm text-text-secondary border border-dashed border-border rounded-xl bg-surface">
                  No submission confirmations required.
                </div>
              ) : (
                confirmations.map((conf) => (
                  <div
                    key={conf.id}
                    className="p-5 rounded-lg border border-border bg-surface shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
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
                        <span className="text-xs font-semibold text-text-primary">
                          {conf.submission?.assignment?.title || 'Assignment'}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary">
                        Submitted by {conf.submission?.submitter?.full_name} on behalf of group "{conf.submission?.group?.name}"
                      </p>
                      {conf.waiver_reason && (
                        <p className="text-[11px] text-purple-700 mt-1">
                          Waiver reason: {conf.waiver_reason}
                        </p>
                      )}
                    </div>

                    <div>
                      {conf.status === 'PENDING' ? (
                        <button
                          onClick={() => handleConfirmParticipation(conf.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Confirm My Participation
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-text-muted">
                          {conf.confirmed_at ? `Confirmed ${new Date(conf.confirmed_at).toLocaleDateString()}` : 'Waived'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: INVITATIONS */}
          {activeTab === 'invitations' && (
            <div className="space-y-4">
              {myInvitations.length === 0 ? (
                <div className="p-12 text-center text-sm text-text-secondary border border-dashed border-border rounded-xl bg-surface">
                  No pending group invitations.
                </div>
              ) : (
                myInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-5 rounded-lg border border-border bg-surface shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-text-primary mb-1">
                        Group Invitation: {inv.group?.name}
                      </h4>
                      <p className="text-xs text-text-secondary">
                        Invited by {inv.inviter?.full_name} ({inv.inviter?.email})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptInvite(inv.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectInvite(inv.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface hover:bg-gray-50 text-text-secondary text-xs font-semibold shadow-xs transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Join Classroom */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-sm w-full p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">Join Classroom</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Classroom Join Code
                </label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3D4"
                  className="w-full px-3 py-2 text-sm uppercase font-mono rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Group */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">Create New Group</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Distributed Systems Lab Group"
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Description (Optional)</label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Goals or project focus..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Capacity (Max Members)</label>
                <input
                  type="number"
                  min={2}
                  max={15}
                  value={newGroupMaxMembers}
                  onChange={(e) => setNewGroupMaxMembers(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Invite Classmate */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-sm w-full p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">Invite Classmate</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Classmate Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-[11px] text-text-muted mt-1">Student must be actively enrolled in this class.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Submit Assignment */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">Submit for Group</h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Submission Reference (e.g. Repository or Document URL)
                </label>
                <input
                  type="text"
                  value={submissionReference}
                  onChange={(e) => setSubmissionReference(e.target.value)}
                  placeholder="https://github.com/... or Google Drive URL"
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Notes / Comments</label>
                <textarea
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Summary of completed milestones..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <p className="text-[11px] text-text-muted">
                Recording this submission will automatically require each member of your group to individually confirm their participation.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs"
                >
                  Confirm & Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
