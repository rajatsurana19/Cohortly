

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

- [ ] Implement academic year management.
- [ ] Implement course creation and management.
- [ ] Implement classroom creation.
- [ ] Implement classroom editing and archiving.
- [ ] Implement professor assignment.
- [ ] Implement student enrollment.
- [ ] Implement classroom join code or invitation flow.
- [ ] Implement student classroom listing.
- [ ] Implement professor classroom listing.
- [ ] Implement enrollment removal and history.

**Acceptance criteria:**

- Courses can contain multiple classes.
- A class belongs to one course and one academic year.
- Professors can manage only assigned classrooms.
- Students can view only classrooms in which they are enrolled.
- Enrollment history is retained.

## Phase 4 - Group Management

### Group creation

- [ ] Implement group creation endpoint.
- [ ] Validate student classroom enrollment.
- [ ] Automatically add creator as first member.
- [ ] Automatically assign creator as initial leader.
- [ ] Enforce one group creation per student per class.
- [ ] Prevent duplicate creation under concurrent requests.
- [ ] Implement group listing and details.
- [ ] Implement group archival and disbanding.

### Group invitations

- [ ] Implement invitation creation.
- [ ] Implement invitation listing.
- [ ] Implement invitation acceptance.
- [ ] Implement invitation rejection.
- [ ] Implement invitation cancellation.
- [ ] Implement invitation expiration.
- [ ] Prevent duplicate pending invitations.
- [ ] Validate eligibility during acceptance.

### Membership and leadership

- [ ] Enforce one active group membership per student per class.
- [ ] Implement group member listing.
- [ ] Implement group member departure.
- [ ] Implement membership history.
- [ ] Implement leadership transfer.
- [ ] Implement professor membership intervention.
- [ ] Implement professor leadership intervention.
- [ ] Record all interventions in audit logs.

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

- [ ] Implement assignment creation.
- [ ] Implement assignment editing.
- [ ] Implement assignment deletion or archival rules.
- [ ] Implement draft status.
- [ ] Implement assignment publication.
- [ ] Implement assignment closing.
- [ ] Implement due date validation.
- [ ] Implement all-groups targeting.
- [ ] Implement selected-groups targeting.
- [ ] Snapshot targeted groups during publication.
- [ ] Implement assignment listing and detail views.
- [ ] Implement assignment notifications.

**Acceptance criteria:**

- Only authorized professors can manage assignments in their classrooms.
- Draft assignments are not visible as published work to students.
- Published assignments have a defined group target.
- Existing assignment targets do not silently change when new groups are created.

## Phase 6 - Submission and Individual Confirmation

### Submission management

- [ ] Implement group submission record creation.
- [ ] Validate assignment and group eligibility.
- [ ] Record submitting user and timestamp.
- [ ] Snapshot eligible group members.
- [ ] Create individual pending confirmation records.
- [ ] Implement individual confirmation endpoint.
- [ ] Implement professor waiver endpoint.
- [ ] Require a reason for waivers.
- [ ] Implement group submission progress.
- [ ] Implement member-level confirmation status.
- [ ] Implement submission notifications.
- [ ] Record submission actions in audit logs.

**Acceptance criteria:**

- A group submission does not automatically confirm all members.
- Every eligible member receives an independent confirmation record.
- Students can confirm only their own participation.
- Professors can identify pending confirmations.
- Waivers are restricted and auditable.

## Phase 7 - Notification and Audit Systems

### Notifications

- [ ] Create notification service.
- [ ] Implement notification listing.
- [ ] Implement mark-as-read operation.
- [ ] Implement unread notification count.
- [ ] Notify students about invitations.
- [ ] Notify students about assignments.
- [ ] Notify students about submission confirmations.
- [ ] Notify professors about relevant classroom activity.

### Audit

- [ ] Implement audit logging service.
- [ ] Log group creation and disbanding.
- [ ] Log invitation decisions.
- [ ] Log membership changes.
- [ ] Log leadership changes.
- [ ] Log professor interventions.
- [ ] Log assignment publication and targeting changes.
- [ ] Log confirmation and waiver actions.
- [ ] Implement authorized audit log viewing.

**Acceptance criteria:**

- Important actions create audit records.
- Users can view only notifications and audit data they are authorized to access.
- Audit records do not contain authentication secrets.

## Phase 8 - Frontend Development

### Shared interface

- [ ] Implement application layout.
- [ ] Implement responsive navigation.
- [ ] Implement reusable buttons, inputs, tables, dialogs, and status indicators.
- [ ] Implement loading states.
- [ ] Implement empty states.
- [ ] Implement error states.
- [ ] Implement form validation.
- [ ] Implement accessible interactions.

### Student interface

- [ ] Registration and login.
- [ ] Student dashboard.
- [ ] My Classes.
- [ ] Class overview.
- [ ] Group listing.
- [ ] Group creation.
- [ ] Group details.
- [ ] Invitation management.
- [ ] Assignment listing and details.
- [ ] Individual confirmation.
- [ ] Notifications and profile.

### Professor interface

- [ ] Professor dashboard.
- [ ] Managed classrooms.
- [ ] Classroom overview.
- [ ] Student management.
- [ ] Group management.
- [ ] Assignment creation and editing.
- [ ] Assignment targeting.
- [ ] Submission tracking.
- [ ] Individual confirmation overview.
- [ ] Professor intervention controls.
- [ ] Classroom activity.

### Administrator interface

- [ ] Administrator dashboard.
- [ ] User management.
- [ ] Professor provisioning.
- [ ] Course management.
- [ ] Classroom oversight.
- [ ] Account status management.
- [ ] Audit log viewer.

**Acceptance criteria:**

- Each role sees the correct navigation and available actions.
- The UI follows `DESIGN.md`.
- Core workflows work on desktop and mobile browsers.
- No interface element is presented as functional unless it is connected to a real backend operation.

## Phase 9 - Testing and Security

### Functional tests

- [ ] Test student registration.
- [ ] Test professor provisioning.
- [ ] Test classroom enrollment.
- [ ] Test group creation.
- [ ] Test invitation acceptance and rejection.
- [ ] Test membership restrictions.
- [ ] Test leadership transfer.
- [ ] Test assignment targeting.
- [ ] Test submission creation.
- [ ] Test individual confirmations.
- [ ] Test professor intervention.
- [ ] Test administrator permissions.

### Security tests

- [ ] Test unauthorized classroom access.
- [ ] Test role escalation attempts.
- [ ] Test invitation ownership.
- [ ] Test confirmation ownership.
- [ ] Test SQL injection protections.
- [ ] Test authentication rate limits.
- [ ] Test session revocation.
- [ ] Test input validation.

### Concurrency tests

- [ ] Test simultaneous group creation by one student.
- [ ] Test simultaneous invitation acceptance into different groups in one class.
- [ ] Test group capacity under concurrent acceptance.
- [ ] Test concurrent leadership changes.
- [ ] Test duplicate submission requests.

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

