

# Joineazy - UI/UX Design Guidelines

**Design direction:** Simple, polished, academic, and easy to understand.

## 1. Design Philosophy

Joineazy should feel like a well-built productivity tool, not a flashy startup landing page.

The interface should prioritize:

- Clear information hierarchy.
- Familiar navigation.
- Readable typography.
- Predictable interactions.
- Minimal visual distractions.
- Consistent layouts across roles.

Avoid excessive gradients, glassmorphism, glowing elements, oversized illustrations, decorative animations, and unnecessary cards.

A user should understand what to do without needing instructions.

## 2. Visual Direction

### Colors

| Purpose | Suggested color |
|---|---|
| Main background | `#F7F8FA` |
| Surface | `#FFFFFF` |
| Primary text | `#171717` |
| Secondary text | `#666B75` |
| Primary action | `#2563EB` |
| Success | `#15803D` |
| Warning | `#B45309` |
| Error | `#DC2626` |
| Borders | `#E5E7EB` |

Use the primary color for important actions and active navigation. Status colors should communicate actual states, not decorate the interface.

### Typography

Use a modern, readable sans-serif font such as Inter.

- Page title: 24-30px
- Section title: 18-20px
- Body: 14-16px
- Supporting text: 12-13px
- Form labels: 13-14px

Maintain consistent font weights and spacing.

### Layout

- Use a centered content area with a reasonable maximum width.
- Use consistent spacing based on a 4px or 8px scale.
- Keep forms compact and understandable.
- Use tables or lists when users need to compare many records.
- Use cards only when they represent independent objects or meaningful summaries.
- Provide loading, empty, success, and error states.

## 3. Navigation

### Student navigation

- Dashboard
- My Classes
- Invitations
- Notifications
- Profile

Inside a class:

- Overview
- Groups
- Assignments
- Members

### Professor navigation

- Dashboard
- My Classes
- Assignments
- Notifications
- Profile

Inside a class:

- Overview
- Students
- Groups
- Assignments
- Activity

### Administrator navigation

- Dashboard
- Users
- Professors
- Courses
- Classes
- Audit Logs
- Settings

Administrator navigation must be separate from student and professor navigation.

## 4. Core Screens

### 4.1 Authentication

Provide:

- Registration for students.
- Login for all roles.
- Password reset.
- Clear validation and error messages.

Professor accounts must be provisioned by an administrator. Do not expose a public professor-registration option.

### 4.2 Student Dashboard

Show:

- Enrolled classes.
- Pending group invitations.
- Recent assignments.
- Pending individual confirmations.
- Relevant notifications.

Prioritize pending actions over decorative statistics.

### 4.3 Class Overview

Display:

- Class name and course.
- Professor information.
- Class announcements or overview information.
- Group and assignment summaries.
- Clear links to class sections.

### 4.4 Groups

The group list should show:

- Group name.
- Leader.
- Member count.
- Group status.
- Relevant actions.

Group detail should show:

- Group name and description.
- Member list.
- Leader indicator.
- Pending invitations, visible to authorized users.
- Membership activity.

When a student has already created a group in a class, the create-group action should be replaced by a clear explanation that the creation limit has been reached.

If a student is already in another group, they should see their existing membership and cannot accept a second active membership invitation in that class.

### 4.5 Assignments

Assignment list should show:

- Title.
- Due date.
- Publication status.
- Targeting information.
- Group progress.

Assignment detail should show:

- Instructions.
- Attachments, if available.
- Applicable groups.
- Submission information.
- Individual member confirmation statuses.

### 4.6 Professor Dashboard

Show:

- Managed classes.
- Recent assignments.
- Groups requiring attention.
- Pending confirmations.
- Upcoming deadlines.

The professor should be able to navigate from a summary directly to the affected class, group, or assignment.

### 4.7 Administrator Dashboard

Show platform-level information:

- Total users.
- Active professors.
- Courses and classes.
- Account provisioning actions.
- Recent administrative activity.

Avoid exposing unnecessary student-level academic data on the main administrator dashboard.

## 5. Interaction Rules

- Use confirmation dialogs for destructive or irreversible actions.
- Explain why an action is unavailable.
- Do not rely on color alone to communicate status.
- Use clear labels such as "Accept invitation" instead of ambiguous icons.
- Disable duplicate submissions while a request is processing.
- Display server-side validation errors near the relevant fields.
- Preserve form data when a recoverable request fails.
- Use pagination for long lists.
- Keep animations short and functional. Respect reduced-motion preferences.

## 6. Responsive Design

Support:

- Desktop: full navigation and data tables.
- Tablet: compact navigation and adaptable layouts.
- Mobile: collapsible navigation, stacked content, and simplified tables.

All essential student and professor actions must remain usable on mobile browsers.

## 7. Accessibility

- Semantic HTML.
- Keyboard-accessible navigation.
- Visible focus indicators.
- Sufficient color contrast.
- Labels for all form controls.
- Accessible modal behavior.
- Meaningful button text.
- Screen-reader-friendly status announcements.

## 8. Design Quality Checklist

- Is the next action obvious?
- Are important details visible without unnecessary scrolling?
- Are errors understandable?
- Does each role see only relevant navigation?
- Are group creation and membership restrictions explained clearly?
- Can a professor quickly identify students with pending confirmations?
- Does the interface remain usable on a small screen?

The goal is a clean academic productivity interface that feels familiar and dependable.

