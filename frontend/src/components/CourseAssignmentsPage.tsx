import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  CheckCircle2,
  Plus,
  Send,
  UserCheck,
  AlertCircle,
  Clock,
  Check,
  X,
  FileText,
  ShieldAlert,
  ChevronRight,
  Crown,
  Loader2,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ClassItem, StudentGroup, Assignment, MemberConfirmation } from '../types';
import { ProgressBar } from './ProgressBar';

interface CourseAssignmentsPageProps {
  classItem: ClassItem;
  onRefreshClasses: () => Promise<void>;
}

export const CourseAssignmentsPage: React.FC<CourseAssignmentsPageProps> = ({
  classItem,
  onRefreshClasses,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'assignments' | 'groups' | 'confirmations'>('assignments');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [userHasCreatedGroup, setUserHasCreatedGroup] = useState<boolean>(false);
  const [currentActiveGroup, setCurrentActiveGroup] = useState<StudentGroup | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [confirmations, setConfirmations] = useState<MemberConfirmation[]>([]);

  // Create Group Modal
  const [showCreateGroupModal, setShowCreateGroupModal] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupDesc, setNewGroupDesc] = useState<string>('');
  const [newGroupMaxMembers, setNewGroupMaxMembers] = useState<number>(5);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');

  // Submission Modal
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [submittingAssignment, setSubmittingAssignment] = useState<Assignment | null>(null);
  const [submissionReference, setSubmissionReference] = useState<string>('');
  const [submissionNotes, setSubmissionNotes] = useState<string>('');

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const [groupsRes, assignRes, confRes] = await Promise.all([
        api.get(`/classes/${classItem.id}/groups`),
        api.get(`/classes/${classItem.id}/assignments`),
        api.get('/confirmations/my'),
      ]);

      if (groupsRes.data?.success) {
        setGroups(groupsRes.data.data.groups);
        setUserHasCreatedGroup(groupsRes.data.data.userHasCreatedGroup);
        setCurrentActiveGroup(groupsRes.data.data.currentActiveGroup);
      }

      if (assignRes.data?.success) {
        setAssignments(assignRes.data.data.assignments);
      }

      if (confRes.data?.success) {
        setConfirmations(confRes.data.data.confirmations);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetails();
  }, [classItem.id]);

  const myLeaderMembership = currentActiveGroup?.memberships.find(
    (m) => m.student_id === user?.id && m.membership_role === 'LEADER'
  );
  const isGroupLeader = Boolean(myLeaderMembership);
  const groupLeader = currentActiveGroup?.memberships.find((m) => m.membership_role === 'LEADER');

  const handleOpenSubmit = (assignment: Assignment) => {
    setSubmittingAssignment(assignment);
    setSubmissionReference('');
    setSubmissionNotes('');
    setShowSubmitModal(true);
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment) return;
    setError(null);
    setSubmitting(true);

    try {
      if (submittingAssignment.submission_type === 'INDIVIDUAL') {
        const res = await api.post(
          `/assignments/${submittingAssignment.id}/individual-submissions`,
          {
            submissionReference: submissionReference.trim() || null,
            notes: submissionNotes.trim() || null,
            acknowledge: true,
          }
        );
        if (res.data?.success) {
          setShowSubmitModal(false);
          setSuccessMsg('Individual assignment submitted and acknowledged.');
          await fetchClassDetails();
          await onRefreshClasses();
        }
      } else {
        if (!currentActiveGroup) {
          setError('You must belong to an active group to submit a group assignment.');
          return;
        }
        const res = await api.post(
          `/assignments/${submittingAssignment.id}/groups/${currentActiveGroup.id}/submissions`,
          {
            submissionReference: submissionReference.trim() || null,
            notes: submissionNotes.trim() || null,
            acknowledge: true,
          }
        );
        if (res.data?.success) {
          setShowSubmitModal(false);
          setSuccessMsg('Group submission recorded and acknowledged across all group members.');
          await fetchClassDetails();
          await onRefreshClasses();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledgeGroupSubmission = async (submissionId: string) => {
    setError(null);
    try {
      const res = await api.post(`/submissions/${submissionId}/acknowledge`);
      if (res.data?.success) {
        setSuccessMsg('Group submission acknowledged across all group members.');
        await fetchClassDetails();
        await onRefreshClasses();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post(`/classes/${classItem.id}/groups`, {
        name: newGroupName,
        description: newGroupDesc,
        maxMembers: newGroupMaxMembers,
      });
      if (res.data?.success) {
        setShowCreateGroupModal(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setSuccessMsg('Group created successfully.');
        await fetchClassDetails();
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
        setSuccessMsg('Invitation sent successfully.');
        await fetchClassDetails();
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
        setSuccessMsg('You have left the group.');
        await fetchClassDetails();
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
        setSuccessMsg('Participation confirmed.');
        await fetchClassDetails();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-left animate-fade-slide-up">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-text-secondary mb-6">
        <button
          onClick={() => navigate('/student')}
          className="hover:text-primary transition-colors flex items-center gap-1"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Courses</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-text-primary font-semibold">
          {classItem.course.code} — {classItem.name}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-primary font-semibold capitalize">{activeTab}</span>
      </nav>

      {/* Course Header Card */}
      <div className="bg-surface rounded-2xl border border-border p-6 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-light text-primary border border-blue-200">
                {classItem.course.code}
              </span>
              {classItem.section && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-text-secondary">
                  Section {classItem.section}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                {classItem.academic_year.name}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {classItem.course.name}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {classItem.professors.map((p) => p.professor.full_name).join(', ') || 'Faculty'}
            </p>
          </div>

          <div className="w-full md:w-72 bg-gray-50/80 rounded-xl p-4 border border-border">
            <ProgressBar
              percent={classItem.analytics?.progressPercent ?? 0}
              label="Course Progress"
              sublabel={`${classItem.analytics?.completedCount ?? 0}/${classItem.analytics?.totalPublished ?? 0} done`}
              status={
                (classItem.analytics?.progressPercent ?? 0) === 100 &&
                (classItem.analytics?.totalPublished ?? 0) > 0
                  ? 'ACKNOWLEDGED'
                  : 'SUBMITTED'
              }
              showBadge={false}
            />
          </div>
        </div>
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-border mb-6 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
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
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Group & Members</span>
        </button>

        <button
          onClick={() => setActiveTab('confirmations')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'confirmations'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Confirmations</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-text-secondary">
          <Loader2 className="w-7 h-7 animate-spin text-primary mb-2" />
          <p className="text-sm">Loading course assignments...</p>
        </div>
      ) : (
        <>
          {/* ASSIGNMENTS TAB */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              {assignments.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-border p-12 text-center">
                  <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-text-primary">No published assignments yet</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    Your professor has not published assignments for this course yet.
                  </p>
                </div>
              ) : (
                assignments.map((assignment) => {
                  const isGroup = assignment.submission_type !== 'INDIVIDUAL';
                  const isPastDue = assignment.due_at ? new Date() > new Date(assignment.due_at) : false;

                  const groupSub = isGroup ? assignment.submissions?.[0] : undefined;
                  const indivSub = !isGroup ? assignment.individual_submissions?.[0] : undefined;

                  const isSubmitted = isGroup ? Boolean(groupSub) : Boolean(indivSub);
                  const isAcknowledged = isGroup
                    ? Boolean(groupSub?.is_acknowledged)
                    : Boolean(indivSub?.is_acknowledged);

                  const status: 'PENDING' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'OVERDUE' = isAcknowledged
                    ? 'ACKNOWLEDGED'
                    : isSubmitted
                    ? 'SUBMITTED'
                    : isPastDue
                    ? 'OVERDUE'
                    : 'PENDING';

                  const progressPercent = isAcknowledged ? 100 : isSubmitted ? 65 : 0;

                  return (
                    <div
                      key={assignment.id}
                      className="bg-surface rounded-2xl border border-border p-6 shadow-xs hover:border-blue-200 transition-all duration-200 animate-fade-slide-up"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                isGroup
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-sky-50 text-sky-700 border-sky-200'
                              }`}
                            >
                              {isGroup ? 'GROUP ASSIGNMENT' : 'INDIVIDUAL ASSIGNMENT'}
                            </span>
                            {assignment.max_score && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-text-secondary">
                                {assignment.max_score} pts
                              </span>
                            )}
                            {assignment.due_at && (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                                  isPastDue && !isSubmitted
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-gray-100 text-text-secondary'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                Due {new Date(assignment.due_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-lg font-bold text-text-primary">{assignment.title}</h3>
                            {assignment.description && (
                              <p className="text-sm text-text-secondary mt-1">{assignment.description}</p>
                            )}
                            {assignment.instructions && (
                              <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-border text-xs text-text-secondary">
                                <span className="font-semibold text-text-primary">Instructions: </span>
                                {assignment.instructions}
                              </div>
                            )}
                          </div>

                          {/* Progress Visualization */}
                          <div className="pt-2 max-w-xl">
                            <ProgressBar
                              percent={progressPercent}
                              status={status}
                              label={
                                isGroup
                                  ? currentActiveGroup
                                    ? `Group: ${currentActiveGroup.name}`
                                    : 'No active group'
                                  : 'Individual Progress'
                              }
                            />
                          </div>

                          {/* Submission / Acknowledgment Feedback */}
                          {isGroup && groupSub && (
                            <div className="mt-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-scale-pop">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>
                                  {groupSub.is_acknowledged
                                    ? `Acknowledged by Group Leader (${groupSub.acknowledger?.full_name || groupSub.submitter.full_name}) on ${new Date(
                                        groupSub.acknowledged_at || groupSub.submitted_at
                                      ).toLocaleString()}. Reflected for all group members.`
                                    : `Submitted by ${groupSub.submitter.full_name}. Pending leader acknowledgment.`}
                                </span>
                              </div>
                              {groupSub.submission_reference && (
                                <a
                                  href={groupSub.submission_reference}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline shrink-0"
                                >
                                  <span>View Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}

                          {!isGroup && indivSub && (
                            <div className="mt-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2 animate-scale-pop">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>
                                  Submitted and acknowledged on{' '}
                                  {new Date(indivSub.acknowledged_at || indivSub.submitted_at).toLocaleString()}.
                                </span>
                              </div>
                              {indivSub.submission_reference && (
                                <a
                                  href={indivSub.submission_reference}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline shrink-0"
                                >
                                  <span>View Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Column */}
                        <div className="lg:w-64 shrink-0 flex flex-col items-stretch justify-center gap-2">
                          {assignment.status === 'CLOSED' ? (
                            <div className="px-4 py-2.5 rounded-xl bg-gray-100 text-text-secondary text-xs font-semibold text-center">
                              Assignment Closed
                            </div>
                          ) : isGroup ? (
                            !currentActiveGroup ? (
                              <button
                                onClick={() => setActiveTab('groups')}
                                className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition"
                              >
                                Join or Create a Group First
                              </button>
                            ) : groupSub ? (
                              !groupSub.is_acknowledged && isGroupLeader ? (
                                <button
                                  onClick={() => handleAcknowledgeGroupSubmission(groupSub.id)}
                                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Acknowledge for Group</span>
                                </button>
                              ) : (
                                <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Completed</span>
                                </div>
                              )
                            ) : isGroupLeader ? (
                              <button
                                onClick={() => handleOpenSubmit(assignment)}
                                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.99]"
                              >
                                <Send className="w-4 h-4" />
                                <span>Submit & Acknowledge</span>
                              </button>
                            ) : (
                              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                                <Crown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <span>
                                  Only your group leader (
                                  <strong>{groupLeader?.student.full_name || 'Leader'}</strong>) can submit and
                                  acknowledge this group assignment.
                                </span>
                              </div>
                            )
                          ) : indivSub ? (
                            <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Submitted & Acknowledged</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenSubmit(assignment)}
                              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.99]"
                            >
                              <Send className="w-4 h-4" />
                              <span>Submit Assignment</span>
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
            <div className="space-y-6">
              {currentActiveGroup ? (
                <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-text-primary">{currentActiveGroup.name}</h3>
                        {isGroupLeader && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Crown className="w-3 h-3" />
                            Group Leader
                          </span>
                        )}
                      </div>
                      {currentActiveGroup.description && (
                        <p className="text-sm text-text-secondary mt-1">{currentActiveGroup.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isGroupLeader && (
                        <button
                          onClick={() => setShowInviteModal(true)}
                          className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Invite Member</span>
                        </button>
                      )}
                      {!isGroupLeader && (
                        <button
                          onClick={handleLeaveGroup}
                          className="px-3.5 py-2 rounded-lg border border-red-200 text-danger hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Leave Group</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentActiveGroup.memberships.map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-xl border border-border bg-gray-50/70 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{m.student.full_name}</div>
                          <div className="text-xs text-text-secondary">{m.student.email}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.membership_role === 'LEADER'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {m.membership_role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-surface rounded-2xl border border-border p-8 text-center">
                  <Users className="w-10 h-10 text-text-muted mx-auto mb-3" />
                  <h3 className="text-base font-bold text-text-primary">You are not in an active group</h3>
                  <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
                    Create a new group (1 group creation allowed per class) or accept an invitation from a classmate.
                  </p>
                  {!userHasCreatedGroup ? (
                    <button
                      onClick={() => setShowCreateGroupModal(true)}
                      className="mt-4 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Group</span>
                    </button>
                  ) : (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      <ShieldAlert className="w-4 h-4" />
                      <span>You have already used your 1 group creation for this class.</span>
                    </div>
                  )}
                </div>
              )}

              {groups.length > 0 && (
                <div className="bg-surface rounded-2xl border border-border p-6">
                  <h4 className="text-sm font-bold text-text-primary mb-4">All Active Classroom Groups</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map((g) => (
                      <div key={g.id} className="p-4 rounded-xl border border-border bg-gray-50/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-text-primary">{g.name}</span>
                          <span className="text-[11px] font-medium text-text-secondary">
                            {g.memberships.length}/{g.max_members} members
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary line-clamp-2">
                          {g.description || 'No description provided'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONFIRMATIONS TAB */}
          {activeTab === 'confirmations' && (
            <div className="space-y-3">
              {confirmations.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-border p-10 text-center text-sm text-text-secondary">
                  No submission confirmations recorded yet.
                </div>
              ) : (
                confirmations.map((c) => (
                  <div
                    key={c.id}
                    className="bg-surface rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-bold text-text-primary">
                        {c.submission?.assignment?.title || 'Group Assignment'}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        Group: {c.submission?.group?.name} • Submitted by {c.submission?.submitter.full_name}
                      </div>
                    </div>
                    {c.status === 'PENDING' ? (
                      <button
                        onClick={() => handleConfirmParticipation(c.id)}
                        className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition"
                      >
                        Confirm Participation
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{c.status}</span>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Submit Assignment Modal */}
      {showSubmitModal && submittingAssignment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-xl max-w-md w-full p-6 animate-scale-pop">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">
                {submittingAssignment.submission_type === 'INDIVIDUAL'
                  ? 'Submit Individual Assignment'
                  : 'Submit & Acknowledge (Leader)'}
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              {submittingAssignment.submission_type === 'GROUP'
                ? `Submitting as Group Leader for "${currentActiveGroup?.name}". This will automatically acknowledge the submission across all group members.`
                : `Submitting your individual work for "${submittingAssignment.title}".`}
            </p>
            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Submission Reference / URL (Optional)
                </label>
                <input
                  type="text"
                  value={submissionReference}
                  onChange={(e) => setSubmissionReference(e.target.value)}
                  placeholder="https://github.com/... or Google Doc link"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Summary of completed work..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm & Submit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-xl max-w-md w-full p-6 animate-scale-pop">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Create Student Group</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
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
                  placeholder="e.g. Team Alpha"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Project focus or collaboration details"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Max Members</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={newGroupMaxMembers}
                  onChange={(e) => setNewGroupMaxMembers(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-xl max-w-md w-full p-6 animate-scale-pop">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Invite Classmate</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Student Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
