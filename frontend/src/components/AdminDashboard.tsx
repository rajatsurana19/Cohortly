import React, { useState, useEffect } from 'react';
import {
  School,
  Plus,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import api from '../services/api';
import { User, Course, AuditLog } from '../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'professors' | 'courses' | 'audit'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');

  // Provision Professor Form
  const [profName, setProfName] = useState<string>('');
  const [profEmail, setProfEmail] = useState<string>('');
  const [profPassword, setProfPassword] = useState<string>('');

  // Create Course Form
  const [courseName, setCourseName] = useState<string>('');
  const [courseCode, setCourseCode] = useState<string>('');
  const [courseDesc, setCourseDesc] = useState<string>('');

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data?.success) setStats(res.data.data.stats);
    } catch (e) {
      // ignore
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (userRoleFilter) params.role = userRoleFilter;
      const res = await api.get('/admin/users', { params });
      if (res.data?.success) setUsers(res.data.data.users);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      if (res.data?.success) setCourses(res.data.data.courses);
    } catch (e) {
      // ignore
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/audit-logs');
      if (res.data?.success) setAuditLogs(res.data.data.auditLogs);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchCourses();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'courses') fetchCourses();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, userRoleFilter]);

  const handleProvisionProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/admin/professors', {
        fullName: profName,
        email: profEmail,
        password: profPassword,
      });

      if (res.data?.success) {
        setSuccessMsg(`Professor account provisioned for ${profName}`);
        setProfName('');
        setProfEmail('');
        setProfPassword('');
        setActiveTab('users');
        await fetchUsers();
        await fetchStats();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/courses', {
        name: courseName,
        code: courseCode,
        description: courseDesc,
      });

      if (res.data?.success) {
        setSuccessMsg(`Course ${courseName} created successfully`);
        setCourseName('');
        setCourseCode('');
        setCourseDesc('');
        await fetchCourses();
        await fetchStats();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    const reason = window.prompt(`Please provide a reason for changing user status to ${newStatus}:`);
    if (!reason) return;

    setError(null);
    try {
      const res = await api.patch(`/admin/users/${userId}/status`, {
        status: newStatus,
        reason,
      });

      if (res.data?.success) {
        setSuccessMsg(`User status updated to ${newStatus}`);
        await fetchUsers();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-left">
      {/* Messages */}
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
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Platform Administration</h1>
          <p className="text-sm text-text-secondary">
            System configuration, user provisioning, academic hierarchy, and audit monitoring
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'stats'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          User Accounts
        </button>

        <button
          onClick={() => setActiveTab('professors')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'professors'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Provision Professor
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'courses'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Courses & Curricula
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'audit'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Audit Log Viewer
        </button>
      </div>

      {/* TAB 1: STATS OVERVIEW */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-5 rounded-xl border border-border bg-surface shadow-xs">
              <span className="text-xs text-text-secondary uppercase font-semibold">Total Users</span>
              <div className="text-2xl font-bold text-text-primary mt-1">{stats?.totalUsers || 0}</div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-surface shadow-xs">
              <span className="text-xs text-text-secondary uppercase font-semibold">Students</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">{stats?.activeStudents || 0}</div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-surface shadow-xs">
              <span className="text-xs text-text-secondary uppercase font-semibold">Professors</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{stats?.activeProfessors || 0}</div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-surface shadow-xs">
              <span className="text-xs text-text-secondary uppercase font-semibold">Courses</span>
              <div className="text-2xl font-bold text-text-primary mt-1">{stats?.totalCourses || 0}</div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-surface shadow-xs">
              <span className="text-xs text-text-secondary uppercase font-semibold">Classrooms</span>
              <div className="text-2xl font-bold text-text-primary mt-1">{stats?.totalClasses || 0}</div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-surface shadow-xs">
              <span className="text-xs text-text-secondary uppercase font-semibold">Groups</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{stats?.totalGroups || 0}</div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-surface">
            <h3 className="text-base font-bold text-text-primary mb-2">Platform Administration Policy</h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">
              Platform Administrators manage system access, provision professor accounts, configure courses, and monitor audit trails. Ordinary academic operations (creating assignments, grading, classroom management) are preserved for professors. All administrator interventions are strictly logged in the append-only audit trail.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-md border border-border bg-surface text-text-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All Roles</option>
                <option value="STUDENT">Students</option>
                <option value="PROFESSOR">Professors</option>
                <option value="PLATFORM_ADMIN">Administrators</option>
              </select>
            </div>

            <button
              onClick={() => setActiveTab('professors')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Provision Professor</span>
            </button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-border text-text-secondary font-semibold">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-text-primary">{u.full_name}</td>
                    <td className="p-3 text-text-secondary">{u.email}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'PLATFORM_ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'PROFESSOR'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {u.role !== 'PLATFORM_ADMIN' && (
                        <div className="inline-flex gap-1">
                          {u.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleUpdateStatus(u.id, 'SUSPENDED')}
                              className="px-2 py-1 text-[11px] font-semibold text-danger hover:bg-red-50 rounded"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(u.id, 'ACTIVE')}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROVISION PROFESSOR */}
      {activeTab === 'professors' && (
        <div className="max-w-md mx-auto p-6 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 mb-4">
            <School className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-text-primary">Provision Professor Account</h3>
          </div>
          <p className="text-xs text-text-secondary mb-6">
            FR-02: Professors cannot self-register; they are provisioned directly by the Platform Administrator.
          </p>

          <form onSubmit={handleProvisionProfessor} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-text-primary mb-1">Full Name</label>
              <input
                type="text"
                required
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                placeholder="Dr. Katherine Johnson"
                className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-primary mb-1">Email Address</label>
              <input
                type="email"
                required
                value={profEmail}
                onChange={(e) => setProfEmail(e.target.value)}
                placeholder="kjohnson@university.edu"
                className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-primary mb-1">Temporary Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={profPassword}
                onChange={(e) => setProfPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition"
            >
              Provision Professor
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: COURSES MANAGEMENT */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 p-6 rounded-xl border border-border bg-surface">
            <h3 className="text-base font-bold text-text-primary mb-4">Create New Course</h3>
            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-text-primary mb-1">Course Name</label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Distributed Systems"
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-primary mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CS401"
                  className="w-full px-3 py-2 text-sm font-mono uppercase rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-primary mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Curriculum overview..."
                  className="w-full px-3 py-2 text-sm rounded-md border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold shadow-xs transition"
              >
                Save Course
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h3 className="text-base font-bold text-text-primary mb-2">Existing Courses</h3>
            {courses.map((crs) => (
              <div key={crs.id} className="p-4 rounded-lg border border-border bg-surface shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-text-primary">{crs.name}</h4>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-text-secondary border border-gray-200">
                    {crs.code}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">{crs.description || 'No description provided'}</p>
                <div className="mt-2 pt-2 border-t border-border text-[11px] text-text-muted">
                  {crs._count?.classes || 0} active classrooms under this course
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOG VIEWER */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gray-50 border border-border text-xs text-text-secondary">
            Append-only security audit log of all administrative and academic actions (user creation, group formations, professor interventions, submission confirmations, waivers).
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-border text-text-secondary font-semibold">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="p-3 whitespace-nowrap text-text-muted">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-text-primary">{log.action}</td>
                    <td className="p-3 text-text-secondary">
                      {log.actor?.full_name} ({log.actor?.role})
                    </td>
                    <td className="p-3 text-text-muted">{log.entity_type}</td>
                    <td className="p-3 text-text-secondary max-w-xs truncate">
                      {log.reason || JSON.stringify(log.new_values) || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
