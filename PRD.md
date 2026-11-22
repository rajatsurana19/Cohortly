

# Joineazy - Product Requirements Document

**Document version:** 1.0  
**Product type:** Academic group and assignment management platform

## 1. Product Overview

Joineazy is a web-based academic collaboration platform that helps professors manage classroom assignments and student groups.

The platform follows a Google Classroom-style academic structure. Professors manage classrooms, publish assignments, monitor student groups, and track submission confirmations. Students join classrooms, create or join groups, collaborate on assignments, and individually confirm their participation in submissions.

Joineazy does not replace a college's complete Learning Management System. Its primary focus is structured group formation, assignment distribution, submission accountability, and classroom-level visibility.

## 2. Problem Statement

Academic group assignments are often managed through informal WhatsApp groups, spreadsheets, shared drives, and manual professor follow-ups.

This creates several problems:

- Professors struggle to identify which students belong to which groups.
- Students may join multiple groups or remain without a group.
- Group creation and membership changes are difficult to track.
- Assignment distribution and group targeting become confusing.
- A single student may submit work without the other group members knowing or confirming it.
- Professors lack a reliable overview of group progress and individual accountability.

Joineazy centralizes these processes within each classroom.

## 3. Product Goals

1. Provide a structured classroom environment for professors and students.
2. Enforce clear group creation and membership rules.
3. Make group invitations and acceptance transparent.
4. Allow professors to create and distribute assignments.
5. Track each member's individual submission confirmation.
6. Give professors classroom-level visibility into group and assignment progress.
7. Maintain an auditable record of important academic actions.

## 4. User Roles

### 4.1 Student

Students can:

- Register using their own account.
- Join a classroom using a valid classroom invitation or join code, subject to the classroom's configured access rules.
- View classrooms in which they are enrolled.
- Create a group, subject to the one-group-creation-per-class rule.
- Receive and respond to group invitations.
- View group members and group details.
- Leave a group, subject to membership and assignment rules.
- View assignments published in their classrooms.
- View group submission progress.
- Individually confirm their participation in a group submission.
- View notifications and relevant activity history.

Students cannot:

- Create or manage classrooms.
- Add themselves as professors.
- Publish or modify assignments.
- View private information belonging to unrelated classrooms.
- Bypass group membership restrictions.

### 4.2 Professor

Professors are provisioned by the platform administrator. They do not use ordinary student self-registration to obtain professor privileges.

Professors can:

- Log in to their provisioned accounts.
- Create and manage their assigned classrooms.
- Enroll or remove students according to classroom access settings.
- View students and groups in their classrooms.
- View group creation and membership history.
- Intervene in group leadership or membership when necessary.
- Create, edit, publish, close, and archive assignments.
- Target assignments to all eligible groups or selected groups.
- Monitor submission confirmations.
- Review classroom and assignment analytics.
- View relevant audit history.

Professors cannot:

- Access classrooms they are not authorized to manage.
- Assign themselves platform administrator privileges.
- Modify platform-wide administrator settings.

### 4.3 Platform Administrator

The platform administrator is separate from the academic professor role.

Platform administrators can:

- Manage user accounts and platform access.
- Provision and deactivate professor accounts.
- Manage academic courses and organizational structure.
- View platform-wide records required for administration.
- Resolve account and access issues.
- Review platform audit logs.
- Suspend accounts or classrooms where necessary.

Platform administrators should not routinely perform academic actions on behalf of professors. Any administrative intervention that changes academic data must be logged.

## 5. Academic Organization

Joineazy uses the following hierarchy:

**Academic Year → Course → Class → Students, Groups and Assignments**

Example:

- Academic Year: 2026-27
- Course: Computer Engineering
- Class: Data Structures - TY-B
- Professor: Assigned professor
- Students: Enrolled students
- Groups: Teams formed by students
- Assignments: Work published inside the classroom

A course represents a broader academic program or subject grouping. A class represents a specific classroom managed by a professor.

A student may be enrolled in multiple classes, including classes belonging to different courses.

Groups and assignments belong to a specific class. A group cannot span multiple classes.

## 6. Group Management Requirements

### 6.1 Group Creation

- Only enrolled students can create groups in a class.
- A student can create at most one group per class.
- The restriction is permanent and remains even if the student leaves, transfers leadership, or the group is disbanded.
- A student may create a group in another class independently.
- The creator automatically becomes the first group member.
- The creator initially becomes the group leader.
- A group must have a name.
- A group may have an optional description.
- Group creation must be atomic. Two simultaneous requests must not create duplicate groups for the same creator in the same class.

### 6.2 Group Membership

- A student can have only one active group membership per class.
- A student can belong to groups in different classes.
- A group can have multiple members, subject to its configured capacity.
- Membership is established through invitation and acceptance.
- Sending an invitation does not immediately make the invited student a member.
- The invited student must be enrolled in the same class.
- A student who already belongs to another active group in the class cannot accept an invitation to a second group.
- The system must prevent duplicate active invitations and conflicting membership operations.
- Membership history must be retained.

### 6.3 Group Leadership

- The group creator is the initial leader.
- A leader can manage normal group-level actions permitted by the system.
- Leadership can be transferred to another active member.
- Professors can intervene when a group has a leadership issue.
- Professor intervention must record the actor, reason, affected group, previous state, and new state.
- A group must have no more than one active leader.
- A group must not be left without a leader while it remains active. If the leader leaves, leadership must be transferred or handled through a controlled professor intervention.

### 6.4 Group Lifecycle

Groups can have the following statuses:

- `ACTIVE`: Group is operating normally.
- `DISBANDED`: Group is no longer active.
- `ARCHIVED`: Group is retained for historical reference.

Disbanding a group must not erase its creator history or membership history.

A disbanded group cannot accept new members or receive new invitations. Historical assignment and submission records must remain accessible to authorized users.

## 7. Assignment Management Requirements

Assignments are created by professors inside a class.

Each assignment should contain:

- Title
- Description
- Instructions
- Creation date
- Publication date
- Due date
- Status
- Attachment references, if supported
- Targeting mode
- Optional submission instructions

Assignment statuses:

- `DRAFT`
- `PUBLISHED`
- `CLOSED`
- `ARCHIVED`

Targeting modes:

- `ALL_GROUPS`: Assignment applies to all eligible active groups in the class.
- `SELECTED_GROUPS`: Assignment applies only to explicitly selected groups.

A published assignment must have a defined target. The platform must preserve which groups were targeted at publication time.

A professor can edit a draft freely. Changes to a published assignment that affect its scope or deadline must be controlled and visible to affected users.

## 8. Submission and Individual Confirmation

Joineazy must distinguish between a group submission record and each member's confirmation.

For every group targeted by an assignment:

1. The group is marked as having a submission record when the submission is recorded.
2. Every eligible group member receives an individual confirmation requirement.
3. Each member confirms their own participation.
4. The system tracks confirmation status separately for every member.
5. Professors can see which members have confirmed and which are pending.

Confirmation statuses:

- `PENDING`
- `CONFIRMED`
- `WAIVED`

A waiver must be performed by an authorized professor or administrator and must include a reason.

The system must not automatically mark all group members as confirmed when one member confirms.

The submission record should include a submission timestamp and the identity of the person who recorded it. If external storage is used, store a reference to the file rather than treating a successful database record as proof that the file itself is valid.

## 9. Notifications

The platform should notify users about relevant events, including:

- Group invitation received.
- Group invitation accepted, rejected, or expired.
- Membership changes.
- Leadership changes.
- New assignment published.
- Assignment deadline approaching.
- Group submission recorded.
- Individual confirmation pending.
- Professor intervention.

Notifications should be stored in the database. Email or push notifications can be added through a separate delivery mechanism.

## 10. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | Students can self-register. |
| FR-02 | Professors are provisioned by administrators. |
| FR-03 | Administrators can manage users and academic structure. |
| FR-04 | Professors can create and manage classrooms. |
| FR-05 | Students can join authorized classrooms. |
| FR-06 | A student can create at most one group per class. |
| FR-07 | A student can have at most one active group membership per class. |
| FR-08 | Group invitations require acceptance. |
| FR-09 | Group creators become initial leaders and members. |
| FR-10 | Professors can intervene in group leadership and membership. |
| FR-11 | Professors can publish assignments in their classrooms. |
| FR-12 | Assignments can target all groups or selected groups. |
| FR-13 | Each member must confirm participation individually. |
| FR-14 | Professors can view group and member-level progress. |
| FR-15 | Important actions are recorded in audit history. |

## 11. Non-Functional Requirements

### Security
- Secure password hashing using Argon2id or an equivalent approved password-hashing algorithm.
- Server-side role and resource-level authorization.
- Secure session handling.
- Input validation on every write endpoint.
- Parameterized database queries.
- Rate limiting on authentication and invitation endpoints.
- Audit logs for sensitive actions.

### Reliability
- Use database transactions for operations involving multiple records.
- Enforce critical business rules at database level wherever possible.
- Prevent duplicate group creation and conflicting membership updates under concurrent requests.

### Performance
- Paginate large student, group, assignment, and audit lists.
- Add indexes for common classroom and membership queries.
- Avoid loading all classroom data in a single request.

### Usability
- Responsive web interface.
- Clear navigation and terminology.
- Understandable error messages.
- Accessible forms and controls.
- Consistent interface across student and professor views.

## 12. MVP Scope

The first release should include:

- Authentication and role management.
- Course and classroom management.
- Student enrollment.
- Group creation and invitations.
- Group membership and leadership.
- Assignment creation and targeting.
- Group submission records.
- Individual member confirmation.
- Notifications.
- Basic professor dashboards.
- Platform administration.
- Audit history.

## 13. Out of Scope for MVP

Unless separately approved, the first release will not include:

- Real-time chat or video calls.
- Full LMS features such as grading, examinations, and attendance.
- AI-generated assignment evaluation.
- Complex document collaboration.
- Native Android or iOS applications.
- Microservices infrastructure.
- Advanced predictive analytics.

## 14. MVP Acceptance Criteria

The MVP is acceptable when:

1. A student can register and join an authorized class.
2. A student cannot create a second group in the same class, even after leaving or disbanding the first group.
3. A student cannot be an active member of two groups in the same class.
4. The same student can create or join groups in different classes.
5. Group invitations require acceptance.
6. Group leadership changes are controlled and recorded.
7. Professors can publish assignments to all or selected groups.
8. Each eligible group member has an independent confirmation status.
9. Professors can identify pending confirmations.
10. Unauthorized users cannot access another classroom's data.
11. Important operations are auditable.
12. Critical rules remain enforced under concurrent requests.

