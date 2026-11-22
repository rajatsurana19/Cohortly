export type UserRole = 'STUDENT' | 'PROFESSOR' | 'PLATFORM_ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  _count?: { classes: number };
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  status: 'ACTIVE' | 'REMOVED';
  enrolled_at: string;
  student?: { id: string; full_name: string; email: string };
}

export interface ClassItem {
  id: string;
  course_id: string;
  academic_year_id: string;
  name: string;
  section?: string | null;
  join_code: string;
  status: 'ACTIVE' | 'ARCHIVED';
  course: Course;
  academic_year: AcademicYear;
  professors: { professor: { id: string; full_name: string; email: string } }[];
  enrollments?: ClassEnrollment[];
  _count?: {
    enrollments: number;
    groups: number;
    assignments: number;
  };
}

export interface GroupMembership {
  id: string;
  group_id: string;
  class_id: string;
  student_id: string;
  membership_role: 'LEADER' | 'MEMBER';
  joined_at: string;
  left_at?: string | null;
  left_reason?: string | null;
  student: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_student_id: string;
  invited_by: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  group: {
    id: string;
    name: string;
    class_id: string;
    class: ClassItem;
    memberships: GroupMembership[];
  };
  inviter: {
    id: string;
    full_name: string;
    email: string;
  };
  invited_student?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface StudentGroup {
  id: string;
  class_id: string;
  name: string;
  description?: string | null;
  created_by: string;
  status: 'ACTIVE' | 'DISBANDED' | 'ARCHIVED';
  max_members: number;
  created_at: string;
  creator: {
    id: string;
    full_name: string;
    email: string;
  };
  memberships: GroupMembership[];
  invitations?: GroupInvitation[];
  _count?: {
    memberships: number;
    invitations: number;
  };
}

export interface Assignment {
  id: string;
  class_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  target_mode: 'ALL_GROUPS' | 'SELECTED_GROUPS';
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  due_at?: string | null;
  published_at?: string | null;
  created_at: string;
  creator: {
    id: string;
    full_name: string;
    email: string;
  };
  assignment_groups?: {
    group: {
      id: string;
      name: string;
      status: string;
      memberships?: GroupMembership[];
    };
  }[];
  submissions?: GroupSubmission[];
  _count?: {
    submissions: number;
  };
}

export interface MemberConfirmation {
  id: string;
  group_submission_id: string;
  student_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'WAIVED';
  confirmed_at?: string | null;
  waived_by?: string | null;
  waiver_reason?: string | null;
  submission?: GroupSubmission;
  student: {
    id: string;
    full_name: string;
    email: string;
  };
  waiver?: {
    id: string;
    full_name: string;
  };
}

export interface GroupSubmission {
  id: string;
  assignment_id: string;
  group_id: string;
  submitted_by: string;
  submitted_at: string;
  submission_reference?: string | null;
  notes?: string | null;
  submitter: {
    id: string;
    full_name: string;
    email: string;
  };
  group?: StudentGroup;
  assignment?: Assignment;
  confirmations: MemberConfirmation[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reason?: string | null;
  old_values?: any;
  new_values?: any;
  created_at: string;
  actor: {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
  };
}
