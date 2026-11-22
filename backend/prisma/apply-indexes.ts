import { prisma } from '../src/config/db';

async function applyCustomIndexes() {
  console.log('Applying critical partial unique indexes to Supabase PostgreSQL...');

  const queries = [
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_active_membership_per_class
     ON group_memberships(student_id, class_id)
     WHERE left_at IS NULL;`,

    `CREATE UNIQUE INDEX IF NOT EXISTS uq_active_group_leader
     ON group_memberships(group_id)
     WHERE left_at IS NULL AND membership_role = 'LEADER';`,

    `CREATE UNIQUE INDEX IF NOT EXISTS uq_active_enrollment_per_class
     ON class_enrollments(class_id, student_id)
     WHERE removed_at IS NULL AND status = 'ACTIVE';`,

    `CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_group_invitation
     ON group_invitations(group_id, invited_student_id)
     WHERE status = 'PENDING';`,
  ];

  for (const q of queries) {
    await prisma.$executeRawUnsafe(q);
  }

  console.log('✓ Successfully applied all partial unique indexes!');
  await prisma.$disconnect();
}

applyCustomIndexes().catch((err) => {
  console.error('Failed to apply custom indexes:', err);
  process.exit(1);
});
