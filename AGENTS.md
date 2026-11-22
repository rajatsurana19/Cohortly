

# Joineazy - Instructions for AI Coding Agents

This document defines the development rules for any AI coding agent or developer working on Joineazy.

## 1. Before Starting Development

Before writing or modifying code:

1. Read `PRD.md`.
2. Read `DESIGN.md`.
3. Read `SYSTEM_ARCHITECTURE.md`.
4. Read `TASK.md`.
5. Understand the existing folder structure and implementation.
6. Check existing database migrations before creating new ones.
7. Identify the affected modules and their dependencies.

Do not start implementing a feature based on assumptions when the requirements are already documented.

## 2. Core Product Rules

These rules are mandatory and must never be weakened for convenience.

### Academic structure

- A course can contain multiple classes.
- A class is the primary academic workspace.
- Groups and assignments belong to a specific class.
- Students may participate in multiple classes.

### Group creation

- A student can create at most one group per class.
- This restriction is permanent.
- Leaving, disbanding, or transferring leadership does not reset the creation limit.
- A student can create groups in other classes.
- The creator automatically becomes the first member and initial leader.

### Group membership

- A student can have only one active group membership per class.
- Group invitations require acceptance.
- An invitation is not membership.
- Only enrolled students can join a class group.
- Membership history must be retained.

### Leadership

- An active group must have no more than one active leader.
- Leadership changes must be atomic.
- Professors can intervene in groups within their assigned classrooms.
- Professor intervention must be audited.

### Assignments and confirmations

- Professors manage assignments in their classrooms.
- Assignments can target all eligible groups or selected groups.
- Each eligible member must confirm participation independently.
- One member's confirmation must never confirm another member automatically.
- Confirmation waivers require authorized action and a reason.

## 3. Architecture Rules

- Follow the modular monolith architecture.
- Keep frontend, backend, database, and shared types logically separated.
- Keep business logic out of route handlers and UI components.
- Use services for business operations.
- Use repositories or a consistent data-access layer for database operations.
- Use migrations for all schema changes.
- Use REST endpoints with consistent response formats.
- Keep modules independent where practical.

Do not introduce microservices, Kafka, Kubernetes, or additional infrastructure without a documented requirement.

## 4. Coding Standards

- Use TypeScript with strict type checking.
- Avoid `any` unless there is a documented reason.
- Use descriptive variable, function, and class names.
- Keep functions focused and reasonably small.
- Avoid duplicated business logic.
- Separate validation, authorization, business logic, and persistence.
- Use shared types and constants for repeated domain values.
- Handle errors explicitly.
- Never silently ignore failed operations.
- Do not leave placeholder implementations in completed features.

## 5. Database Rules

- Use UUID identifiers for application entities.
- Use foreign keys for relationships.
- Use unique constraints and indexes for critical business rules.
- Use database transactions for multi-record operations.
- Never rely exclusively on frontend validation.
- Do not hard-delete academic history.
- Prefer status changes and archival.
- Store timestamps consistently in UTC.
- Never store raw passwords, refresh tokens, or authentication secrets.
- Add indexes based on actual query patterns.

Before changing a database schema:

1. Inspect the current schema.
2. Create a migration.
3. Preserve existing data.
4. Update affected application code.
5. Add or update tests.
6. Verify migration and rollback behavior where supported.

## 6. Security Rules

- Verify authorization on the backend.
- Check resource ownership and classroom access.
- Never trust a user ID, role, group ID, or class ID supplied by the frontend without validation.
- Validate all request bodies, query parameters, and path parameters.
- Use parameterized database queries.
- Do not expose passwords, tokens, or internal error details.
- Apply rate limits to sensitive operations.
- Keep secrets out of source control.
- Audit professor and administrator interventions.

## 7. API Rules

- Use correct HTTP methods and status codes.
- Validate requests before executing business operations.
- Return consistent error structures.
- Use pagination for potentially large lists.
- Avoid exposing internal database structures directly.
- Document new endpoints in the API specification.
- Prevent duplicate requests from creating duplicate records.

## 8. Frontend Rules

- Follow `DESIGN.md`.
- Keep the interface simple, polished, responsive, and accessible.
- Use reusable components.
- Use role-specific navigation.
- Do not implement security rules only in the frontend.
- Display useful loading, empty, success, and error states.
- Explain why restricted actions are unavailable.
- Do not add unnecessary animations, gradients, decorative dashboards, or fake statistics.
- Avoid buttons that do not perform a real action.
- Never display mock data as real platform data.

## 9. Testing Rules

Every completed feature must include appropriate tests.

At minimum:

- Unit tests for business rules.
- Integration tests for database operations.
- Authorization tests for protected operations.
- Regression tests for affected functionality.

For group operations, test concurrent requests and verify that database constraints remain intact.

A feature is not complete merely because the UI renders successfully.

## 10. Development Workflow

For every task:

1. Identify the requirement and acceptance criteria.
2. Inspect existing code.
3. Identify affected modules.
4. Implement the smallest complete solution.
5. Add or update migrations if needed.
6. Add tests.
7. Run relevant tests and type checks.
8. Update API documentation.
9. Update `TASK.md`.
10. Report completed work and remaining limitations.

Do not silently change product requirements or database relationships.

If a requirement is ambiguous or conflicts with existing implementation, explain the conflict and request clarification before making an irreversible design decision.

## 11. Completion Report

After each task, report:

- What was implemented.
- Which files were changed.
- Which migrations were added.
- Which tests were executed.
- Whether tests passed.
- Any known limitations.
- What remains to be completed.

Never claim that a feature is complete if its backend, validation, authorization, or tests are missing.

