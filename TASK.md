

# Joineazy - Development Task Plan

This document defines the implementation sequence for Joineazy.

Tasks should be completed in order unless a dependency requires otherwise. Update checkboxes only after implementation and verification.

## Phase 0 - Project Foundation

### Project setup

- [x] Create frontend project using React and TypeScript.
- [x] Create backend project using Node.js, Express, and TypeScript.
- [x] Configure strict TypeScript settings.
- [x] Configure ESLint and Prettier.
- [x] Set up environment configuration.
- [x] Create `.env.example`.
- [x] Configure Docker and Docker Compose.
- [x] Set up PostgreSQL connection.
- [x] Create health-check endpoint.
- [x] Configure centralized logging.
- [x] Create a consistent API response and error structure.

**Acceptance criteria:**

- Frontend and backend start successfully.
- Database connection works.
- Health endpoint returns a successful response.
- Secrets are not committed to source control.

## Phase 1 - Database and Core Architecture

### Database setup

- [x] Create initial database migration.
- [x] Create users table.
- [x] Create user sessions table.
- [x] Create academic years table.
- [x] Create courses table.
- [x] Create classes table.
- [x] Create class professors table.
- [x] Create class enrollments table.
- [x] Create student groups table.
- [x] Create group memberships table.
- [x] Create group invitations table.
- [x] Create assignments table.
- [x] Create assignment groups table.
- [x] Create group submissions table.
- [x] Create member confirmations table.
- [x] Create notifications table.
- [x] Create audit logs table.
- [x] Add foreign keys and unique constraints.
- [x] Add indexes for common queries.
- [x] Verify critical partial unique indexes.

**Acceptance criteria:**

- Migrations run successfully.
- Relationships are enforced by PostgreSQL.
- Group creation and membership restrictions are represented at database level.
- Existing records are not silently deleted during schema changes.

## Phase 2 - Authentication and Authorization

### Authentication

- [x] Implement student registration.
- [x] Implement login.
- [x] Implement logout.
- [x] Implement password hashing.
- [x] Implement session creation and revocation.
- [x] Implement refresh or session renewal.
- [x] Implement current-user endpoint.
- [x] Implement password reset flow.
- [x] Implement account status checks.

### Authorization

- [x] Implement student role.
- [x] Implement professor role.
- [x] Implement platform administrator role.
- [x] Create backend authorization middleware.
- [x] Create resource-level authorization checks.
- [x] Protect all role-specific endpoints.
- [x] Add rate limiting to authentication endpoints.

**Acceptance criteria:**

- Students can register themselves.
- Professor accounts cannot be created through student registration.
- Administrators can provision professors.
- Users cannot access unauthorized role-specific endpoints.
- Suspended and inactive accounts cannot perform protected actions.

## Phase 3 - Academic Management

### Courses and classrooms

- [x] Implement academic year management.
- [x] Implement course creation and management.
- [x] Implement classroom creation.
- [x] Implement classroom editing and archiving.
- [x] Implement professor assignment.
- [x] Implement student enrollment.
- [x] Implement classroom join code or invitation flow.
- [x] Implement student classroom listing.
- [x] Implement professor classroom listing.
- [x] Implement enrollment removal and history.

**Acceptance criteria:**

- Courses can contain multiple classes.
- A class belongs to one course and one academic year.
- Professors can manage only assigned classrooms.
- Students can view only classrooms in which they are enrolled.
- Enrollment history is retained.

## Phase 4 - Group Management

### Group creation

- [x] Implement group creation endpoint.
- [x] Validate student classroom enrollment.
- [x] Automatically add creator as first member.
- [x] Automatically assign creator as initial leader.
- [x] Enforce one group creation per student per class.
- [x] Prevent duplicate creation under concurrent requests.
- [x] Implement group listing and details.
- [x] Implement group archival and disbanding.

### Group invitations

- [x] Implement invitation creation.
- [x] Implement invitation listing.
- [x] Implement invitation acceptance.
- [x] Implement invitation rejection.
- [x] Implement invitation cancellation.
- [x] Implement invitation expiration.
- [x] Prevent duplicate pending invitations.
- [x] Validate eligibility during acceptance.

### Membership and leadership

- [x] Enforce one active group membership per student per class.
- [x] Implement group member listing.
- [x] Implement group member departure.
- [x] Implement membership history.
- [x] Implement leadership transfer.
- [x] Implement professor membership intervention.
- [x] Implement professor leadership intervention.
- [x] Record all interventions in audit logs.

**Acceptance criteria:**

- A student cannot create a second group in the same class, even after leaving or disbanding the first.
- A student can create groups in different classes.
- A student cannot actively belong to two groups in one class.
- Invitations require acceptance.
- Group creation automatically creates the creator's membership.
- Active groups maintain one active leader.
- Membership and leadership changes are auditable.

## Phase 5 - Assignment Management

### Assignment operations

- [x] Implement assignment creation.
- [x] Implement assignment editing.
- [x] Implement assignment deletion or archival rules.
- [x] Implement draft status.
- [x] Implement assignment publication.
- [x] Implement assignment closing.
- [x] Implement due date validation.
- [x] Implement all-groups targeting.
- [x] Implement selected-groups targeting.
- [x] Snapshot targeted groups during publication.
- [x] Implement assignment listing and detail views.
- [x] Implement assignment notifications.

**Acceptance criteria:**

- Only authorized professors can manage assignments in their classrooms.
- Draft assignments are not visible as published work to students.
- Published assignments have a defined group target.
- Existing assignment targets do not silently change when new groups are created.

## Phase 6 - Submission and Individual Confirmation

### Submission management

- [x] Implement group submission record creation.
- [x] Validate assignment and group eligibility.
- [x] Record submitting user and timestamp.
- [x] Snapshot eligible group members.
- [x] Create individual pending confirmation records.
- [x] Implement individual confirmation endpoint.
- [x] Implement professor waiver endpoint.
- [x] Require a reason for waivers.
- [x] Implement group submission progress.
- [x] Implement member-level confirmation status.
- [x] Implement submission notifications.
- [x] Record submission actions in audit logs.

**Acceptance criteria:**

- A group submission does not automatically confirm all members.
- Every eligible member receives an independent confirmation record.
- Students can confirm only their own participation.
- Professors can identify pending confirmations.
- Waivers are restricted and auditable.

## Phase 7 - Notification and Audit Systems

### Notifications

- [x] Create notification service.
- [x] Implement notification listing.
- [x] Implement mark-as-read operation.
- [x] Implement unread notification count.
- [x] Notify students about invitations.
- [x] Notify students about assignments.
- [x] Notify students about submission confirmations.
- [x] Notify professors about relevant classroom activity.

### Audit

- [x] Implement audit logging service.
- [x] Log group creation and disbanding.
- [x] Log invitation decisions.
- [x] Log membership changes.
- [x] Log leadership changes.
- [x] Log professor interventions.
- [x] Log assignment publication and targeting changes.
- [x] Log confirmation and waiver actions.
- [x] Implement authorized audit log viewing.

**Acceptance criteria:**

- Important actions create audit records.
- Users can view only notifications and audit data they are authorized to access.
- Audit records do not contain authentication secrets.

## Phase 8 - Frontend Development

### Shared interface

- [x] Implement application layout.
- [x] Implement responsive navigation.
- [x] Implement reusable buttons, inputs, tables, dialogs, and status indicators.
- [x] Implement loading states.
- [x] Implement empty states.
- [x] Implement error states.
- [x] Implement form validation.
- [x] Implement accessible interactions.

### Student interface

- [x] Registration and login.
- [x] Student dashboard.
- [x] My Classes.
- [x] Class overview.
- [x] Group listing.
- [x] Group creation.
- [x] Group details.
- [x] Invitation management.
- [x] Assignment listing and details.
- [x] Individual confirmation.
- [x] Notifications and profile.

### Professor interface

- [x] Professor dashboard.
- [x] Managed classrooms.
- [x] Classroom overview.
- [x] Student management.
- [x] Group management.
- [x] Assignment creation and editing.
- [x] Assignment targeting.
- [x] Submission tracking.
- [x] Individual confirmation overview.
- [x] Professor intervention controls.
- [x] Classroom activity.

### Administrator interface

- [x] Administrator dashboard.
- [x] User management.
- [x] Professor provisioning.
- [x] Course management.
- [x] Classroom oversight.
- [x] Account status management.
- [x] Audit log viewer.

**Acceptance criteria:**

- Each role sees the correct navigation and available actions.
- The UI follows `DESIGN.md`.
- Core workflows work on desktop and mobile browsers.
- No interface element is presented as functional unless it is connected to a real backend operation.

## Phase 9 - Testing and Security

### Functional tests

- [x] Test student registration.
- [x] Test professor provisioning.
- [x] Test classroom enrollment.
- [x] Test group creation.
- [x] Test invitation acceptance and rejection.
- [x] Test membership restrictions.
- [x] Test leadership transfer.
- [x] Test assignment targeting.
- [x] Test submission creation.
- [x] Test individual confirmations.
- [x] Test professor intervention.
- [x] Test administrator permissions.

### Security tests

- [x] Test unauthorized classroom access.
- [x] Test role escalation attempts.
- [x] Test invitation ownership.
- [x] Test confirmation ownership.
- [x] Test SQL injection protections.
- [x] Test authentication rate limits.
- [x] Test session revocation.
- [x] Test input validation.

### Concurrency tests

- [x] Test simultaneous group creation by one student.
- [x] Test simultaneous invitation acceptance into different groups in one class.
- [x] Test group capacity under concurrent acceptance.
- [x] Test concurrent leadership changes.
- [x] Test duplicate submission requests.

**Acceptance criteria:**

- Critical business rules remain valid under concurrent requests.
- Unauthorized requests are rejected.
- Automated tests cover the important academic workflows.
- No known critical security issue remains unresolved.

## Phase 10 - Deployment and Release

- [ ] Prepare production environment variables.
- [ ] Configure HTTPS.
- [ ] Configure production database.
- [ ] Configure database backups.
- [ ] Configure application logging.
- [ ] Configure frontend deployment.
- [ ] Configure backend deployment.
- [ ] Run production migrations.
- [ ] Verify authentication and authorization.
- [ ] Run end-to-end smoke tests.
- [ ] Verify database backup restoration.
- [ ] Prepare deployment and rollback documentation.

**Release acceptance criteria:**

- The application is accessible through its production URL.
- Student, professor, and administrator workflows work.
- Database constraints are active.
- HTTPS and secure session handling are configured.
- Backups and basic monitoring are operational.

## Development Priority

| Priority | Phases | Importance |
|---|---|---|
| P0 | 0-4 | Core foundation and group functionality |
| P0 | 5-6 | Assignments and submission accountability |
| P1 | 7-8 | Notifications and complete user interfaces |
| P1 | 9 | Testing and security verification |
| P1 | 10 | Production deployment |

## Final Development Rule

Do not move to the next phase simply because the current screens look complete.

A phase is complete only when its backend logic, database constraints, authorization, frontend integration, and relevant tests are implemented and verified.

