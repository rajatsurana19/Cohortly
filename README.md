# Cohortly - Academic Group and Assignment Management Platform

Cohortly is an academic collaboration and assignment management platform designed to provide structured group formation, assignment targeting, and individual submission accountability in classroom environments.

---

## 1. Executive Summary

In higher education, collaborative coursework often relies on fragmented communication channels (informal chat groups, spreadsheets, manual email submissions). This lack of structure creates critical administrative and academic challenges:
- Difficulty identifying group members and leaders.
- Students participating in multiple groups simultaneously or left without teams.
- Groups mutating unpredictably after assignments have been distributed.
- Group members taking credit for submissions without verifying their participation.
- Absence of auditable historical records for grading disputes.

Cohortly addresses these issues by modeling a Google Classroom-style academic workspace with database-level integrity constraints, atomic leadership transitions, and independent member submission confirmations.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, Axios
- **Backend**: Node.js 22, Express, TypeScript (Strict Mode)
- **Database**: PostgreSQL (Supabase Connection Pooler)
- **ORM & Migrations**: Prisma Client, Prisma Migrate, Custom SQL Partial Unique Indexes
- **Authentication**: JWT (JSON Web Tokens), HttpOnly cookies, Argon2id/Bcrypt password hashing
- **Containerization**: Docker, Docker Compose

---

## 3. User Roles and Authorization Matrix

Cohortly implements role-based access control (RBAC) paired with resource-level authorization:

| Capability | Student | Professor | Platform Admin |
|---|:---:|:---:|:---:|
| Self-Registration | Yes | No | No |
| Join Class via Join Code | Yes | No | No |
| Create Classroom Group | Yes (Max 1 per class) | No | No |
| Invite Classmates & Transfer Leadership | Yes | No | No |
| Submit Assignment on Behalf of Group | Yes | No | No |
| Confirm Individual Submission Participation | Yes | No | No |
| Create & Manage Classrooms | No | Yes | Yes |
| Publish & Close Assignments | No | Yes | Yes |
| Intervene in Group Leadership / Membership | No | Yes | Yes |
| Waive Student Submission Confirmation | No | Yes | Yes |
| Provision Professor Accounts | No | No | Yes |
| Platform-wide Audit Log Inspection | No | No | Yes |
| Suspend / Activate User Accounts | No | No | Yes |

---

## 4. Mandatory Domain Rules

The platform enforces the following academic invariants at the database level:

1. **Permanent Group Creation Limit**:
   - A student can create at most one group per class.
   - Leaving, transferring leadership, or disbanding the group does not reset this restriction.
   - Enforced by unique constraint `(class_id, created_by)` on `student_groups`.

2. **Single Active Membership**:
   - A student can belong to at most one active group per class.
   - Enforced by partial unique index `(student_id, class_id) WHERE left_at IS NULL` on `group_memberships`.

3. **Atomic Single Leader Guarantee**:
   - An active group must maintain exactly one active leader.
   - Leadership transfers occur atomically inside a database transaction.
   - Enforced by partial unique index `(group_id) WHERE left_at IS NULL AND membership_role = 'LEADER'`.

4. **Target Group Scope Freezing**:
   - Publishing an assignment freezes the targeted groups into `assignment_groups`.
   - New groups created after publication do not alter the historical scope of existing assignments.

5. **Individual Participation Confirmation**:
   - Submitting an assignment generates an independent confirmation record for every active member of the group.
   - One member confirming participation never confirms another member automatically.
   - Confirmation waivers require professor or administrator action and a documented academic reason.

6. **Auditable Interventions**:
   - Every professor or administrative override (disbanding a group, reassigning a leader, removing a student, waiving a confirmation) requires a mandatory reason and is written to the append-only `audit_logs` table.

---

## 5. System Architecture

Cohortly uses a modular monolith architecture. Modules are logically separated inside a single unified codebase sharing one relational database:

```text
                  STUDENT / PROFESSOR / ADMIN
                              |
                              v
                        React Frontend
                              |
                        RESTful API
                              |
                              v
                       Express Backend
                              |
        +---------------------+----------------------+
        |                     |                      |
        v                     v                      v
  Authentication        Academic Module         Group Module
  (JWT, Sessions)      (Courses, Classes)     (Groups, Memberships)
        |                     |                      |
        +---------------------+----------------------+
        |                     |                      |
        v                     v                      v
  Assignment Module     Submission Module      Audit & Notification
 (Targeting, Status)  (Confirmations, Waivers)  (Events, Logs)
        |                     |                      |
        +---------------------+----------------------+
                              |
                              v
                    PostgreSQL (Supabase)
```

---

## 6. Database Schema and Constraints

The application schema consists of 16 relational entities:

- `users`: Core user accounts (Student, Professor, Platform Admin).
- `user_sessions`: Refresh token rotation and active session tracking.
- `academic_years`: Academic calendar periods (e.g., 2026-2027).
- `courses`: Academic subjects or degree modules (e.g., CS401).
- `classes`: Specific classroom sections managed by professors.
- `class_professors`: Mapping of assigned faculty to classrooms.
- `class_enrollments`: Historical and active student classroom enrollments.
- `student_groups`: Student teams formed within a specific classroom.
- `group_memberships`: Historical and current member roles (LEADER, MEMBER).
- `group_invitations`: Formal group invitations with lifecycle states.
- `assignments`: Assignments created by professors (DRAFT, PUBLISHED, CLOSED).
- `assignment_groups`: Frozen snapshots of targeted groups at publication.
- `group_submissions`: Submissions delivered by a team member.
- `member_confirmations`: Individual participation records per member.
- `notifications`: User notifications for assignments, invitations, and submissions.
- `audit_logs`: Append-only audit logs recording actor, action, entity, and state deltas.

### Critical Database Indexes

```sql
-- 1. One group creation per student per class permanently
CREATE UNIQUE INDEX uq_group_creator_per_class
ON student_groups(class_id, created_by);

-- 2. Max one active membership per student per class
CREATE UNIQUE INDEX uq_active_membership_per_class
ON group_memberships(student_id, class_id)
WHERE left_at IS NULL;

-- 3. Max one active leader per group
CREATE UNIQUE INDEX uq_active_group_leader
ON group_memberships(group_id)
WHERE left_at IS NULL AND membership_role = 'LEADER';

-- 4. Single active enrollment per student per class
CREATE UNIQUE INDEX uq_active_enrollment_per_class
ON class_enrollments(class_id, student_id)
WHERE removed_at IS NULL AND status = 'ACTIVE';

-- 5. Prevent duplicate pending invitations
CREATE UNIQUE INDEX uq_pending_group_invitation
ON group_invitations(group_id, invited_student_id)
WHERE status = 'PENDING';
```

---

## 7. API Reference

All write endpoints validate incoming request bodies using Zod schemas. Responses conform to standard structures:

Success:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Description of error",
    "details": []
  }
}
```

### Authentication Endpoints
- `POST /api/auth/register`: Student self-registration.
- `POST /api/auth/login`: Authentication for all roles.
- `POST /api/auth/refresh`: Refresh access token via session verification.
- `POST /api/auth/logout`: Revoke active session tokens.
- `GET /api/auth/me`: Retrieve authenticated user identity.
- `POST /api/auth/change-password`: Change password and revoke prior sessions.

### Academic Endpoints
- `GET /api/courses`: List academic courses.
- `POST /api/courses`: Create course (Administrator only).
- `GET /api/academic-years`: List academic years.
- `GET /api/classes`: Role-scoped list of classrooms.
- `POST /api/classes`: Create classroom (Professor/Admin).
- `GET /api/classes/:classId`: Retrieve classroom details, enrollments, and counts.
- `POST /api/classes/join`: Enroll student via classroom join code.
- `POST /api/classes/:classId/professors`: Assign faculty to classroom (Admin).
- `DELETE /api/classes/:classId/enrollments/:studentId`: Remove student (soft-delete).

### Group Endpoints
- `GET /api/classes/:classId/groups`: List classroom groups and creator limits.
- `POST /api/classes/:classId/groups`: Create group (Atomic LEADER creation).
- `GET /api/groups/:groupId`: Group details, active members, and invitations.
- `POST /api/groups/:groupId/invitations`: Invite enrolled classmate.
- `GET /api/invitations/my`: View pending invitations for current student.
- `POST /api/invitations/:invitationId/accept`: Accept invitation atomically.
- `POST /api/invitations/:invitationId/reject`: Reject invitation.
- `POST /api/groups/:groupId/leadership-transfer`: Transfer group leadership.
- `POST /api/groups/:groupId/leave`: Leave group (requires prior transfer if leader).
- `POST /api/groups/:groupId/intervene`: Professor intervention with mandatory reason.

### Assignment Endpoints
- `GET /api/classes/:classId/assignments`: List published/draft assignments.
- `POST /api/classes/:classId/assignments`: Create draft assignment.
- `GET /api/assignments/:assignmentId`: Detailed assignment view.
- `PATCH /api/assignments/:assignmentId`: Update draft assignment.
- `POST /api/assignments/:assignmentId/publish`: Freeze target groups and publish.
- `POST /api/assignments/:assignmentId/close`: Terminate submission window.

### Submission & Confirmation Endpoints
- `POST /api/assignments/:assignmentId/groups/:groupId/submissions`: Record submission and generate member confirmations.
- `GET /api/confirmations/my`: List pending participation confirmations.
- `POST /api/confirmations/:confirmationId/confirm`: Student confirms own participation.
- `POST /api/confirmations/:confirmationId/waive`: Professor waives confirmation with reason.

### Administrator Endpoints
- `GET /api/admin/stats`: System-wide metrics.
- `GET /api/admin/users`: Paginated user accounts with role filtering.
- `POST /api/admin/professors`: Provision faculty account.
- `PATCH /api/admin/users/:userId/status`: Update account status (Active, Suspended, Inactive).
- `GET /api/admin/audit-logs`: Query append-only audit logs.

### Notification Endpoints
- `GET /api/notifications`: Retrieve user notifications and unread counter.
- `POST /api/notifications/:notificationId/read`: Mark single notification read.
- `POST /api/notifications/read-all`: Mark all notifications read.

---

## 8. Installation and Local Setup

### Prerequisites
- Node.js 20 or higher
- npm 10 or higher
- PostgreSQL database instance or Supabase account

### Environment Configuration

Create `.env` in the `backend/` directory based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Direct / Pooler PostgreSQL connection URL
DATABASE_URL="postgresql://postgres:[USER]:[PASSWORD]@[HOST]:[PORT]/postgres"
DIRECT_URL="postgresql://postgres:[USER]:[PASSWORD]@[HOST]:[PORT]/postgres"

# Supabase API (Optional)
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="your-anon-key"

# JWT configuration
JWT_SECRET="cohortly_super_secure_jwt_secret_change_in_production_2026"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_SECRET="cohortly_super_secure_refresh_secret_2026"
REFRESH_TOKEN_EXPIRES_IN="30d"
```

### Installation Steps

1. Clone repository:
   ```bash
   git clone https://github.com/rajatsurana19/Cohortly.git
   cd Cohortly
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Synchronize database schema and apply indexes:
   ```bash
   npx prisma db push
   npx tsx prisma/apply-indexes.ts
   ```

4. Seed initial Administrator and Academic Year:
   ```bash
   npx tsx prisma/seed.ts
   ```

5. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

6. Start Development Servers:
   - Backend (`http://localhost:5000`):
     ```bash
     cd backend && npm run dev
     ```
   - Frontend (`http://localhost:5173`):
     ```bash
     cd frontend && npm run dev
     ```

---

## 9. Testing Strategy

The test suite covers unit logic, database constraints, and end-to-end academic workflows.

### Running Authentication & Unit Tests
```bash
cd backend
npm test
```
Verifies:
- Password hashing and verification.
- JWT token generation and claim extraction.
- Database connection liveness.
- Initial Administrator account provisioning.

### Running Integration & Constraint Tests
```bash
cd backend
npm run test:integration
```
Verifies:
- Professor assignment and student enrollment in classrooms.
- Atomic group creation with creator assigned as LEADER.
- Database failure when a student attempts to create a second group in the same class.
- Invitation lifecycle and acceptance transactions.
- Atomic leadership transfer.
- Assignment publishing and target group freezing.
- Submission generation with independent pending confirmations.
- Individual member participation confirmation.
- Professor waiver handling with recorded academic reason.

---

## 10. Container Deployment

Run the complete platform via Docker Compose:

```bash
docker compose up --build
```

Services:
- `backend`: Express API on port 5000.
- `frontend`: React SPA production preview on port 5173.

---

## 11. Initial Credentials for Evaluation

When seeded via `prisma/seed.ts`, the default administrative credentials are:

- **Email**: `admin@cohortly.edu`
- **Password**: `CohortlyAdmin2026!`
- **Role**: `PLATFORM_ADMIN`

Students can self-register directly through the frontend interface. Professor accounts can be provisioned by the Administrator through the Administrator dashboard.
