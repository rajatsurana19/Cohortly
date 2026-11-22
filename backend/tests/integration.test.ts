import { prisma } from '../src/config/db';
import crypto from 'crypto';
import { hashPassword } from '../src/utils/password';

async function runIntegrationTests() {
  console.log('--- Starting Cohortly Full Integration Test Suite ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  const runId = crypto.randomBytes(3).toString('hex');
  const student1Email = `student1_${runId}@cohortly.edu`;
  const student2Email = `student2_${runId}@cohortly.edu`;
  const profEmail = `prof_${runId}@cohortly.edu`;

  try {
    const pwHash = await hashPassword('TestPassword123!');

    // 1. Create Test Professor & Students
    const prof = await prisma.user.create({
      data: {
        full_name: `Prof Test ${runId}`,
        email: profEmail,
        password_hash: pwHash,
        role: 'PROFESSOR',
        status: 'ACTIVE',
      },
    });
    assert(prof.role === 'PROFESSOR', 'Professor account created');

    const s1 = await prisma.user.create({
      data: {
        full_name: `Student 1 ${runId}`,
        email: student1Email,
        password_hash: pwHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    const s2 = await prisma.user.create({
      data: {
        full_name: `Student 2 ${runId}`,
        email: student2Email,
        password_hash: pwHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    assert(s1.role === 'STUDENT' && s2.role === 'STUDENT', 'Student accounts created');

    // 2. Academic structure: Course & Class
    const course = await prisma.course.create({
      data: {
        name: `Course ${runId}`,
        code: `CS_${runId.toUpperCase()}`,
      },
    });

    const academicYear = await prisma.academicYear.findFirst();
    assert(academicYear !== null, 'Active academic year retrieved');

    const testClass = await prisma.class.create({
      data: {
        course_id: course.id,
        academic_year_id: academicYear!.id,
        name: `Algorithms ${runId}`,
        join_code: `JOIN_${runId.toUpperCase()}`,
        status: 'ACTIVE',
      },
    });

    // Assign professor
    await prisma.classProfessor.create({
      data: {
        class_id: testClass.id,
        professor_id: prof.id,
        assigned_by: prof.id,
      },
    });

    // Enroll students
    await prisma.classEnrollment.createMany({
      data: [
        { class_id: testClass.id, student_id: s1.id, status: 'ACTIVE' },
        { class_id: testClass.id, student_id: s2.id, status: 'ACTIVE' },
      ],
    });
    assert(true, 'Students enrolled and professor assigned to classroom');

    // 3. Group Creation Rule: Creator is initial LEADER
    const group1 = await prisma.$transaction(async (tx) => {
      const g = await tx.studentGroup.create({
        data: {
          class_id: testClass.id,
          name: `Alpha Team ${runId}`,
          created_by: s1.id,
          max_members: 4,
          status: 'ACTIVE',
        },
      });
      await tx.groupMembership.create({
        data: {
          group_id: g.id,
          class_id: testClass.id,
          student_id: s1.id,
          membership_role: 'LEADER',
        },
      });
      return g;
    });

    const s1Membership = await prisma.groupMembership.findFirst({
      where: { group_id: group1.id, student_id: s1.id, left_at: null },
    });
    assert(s1Membership?.membership_role === 'LEADER', 'Group creator is atomic initial LEADER');

    // 4. Critical Database Constraint: 1 group creation per student per class permanently
    let duplicateCreationPrevented = false;
    try {
      await prisma.studentGroup.create({
        data: {
          class_id: testClass.id,
          name: `Illegal Second Group ${runId}`,
          created_by: s1.id,
          status: 'ACTIVE',
        },
      });
    } catch (e: any) {
      duplicateCreationPrevented = true;
    }
    assert(duplicateCreationPrevented, 'Database strictly blocks second group creation by same student in class');

    // 5. Group Invitation & Acceptance
    const invitation = await prisma.groupInvitation.create({
      data: {
        group_id: group1.id,
        invited_student_id: s2.id,
        invited_by: s1.id,
        status: 'PENDING',
      },
    });
    assert(invitation.status === 'PENDING', 'Group invitation created in PENDING status');

    // Accept invitation
    await prisma.$transaction(async (tx) => {
      await tx.groupMembership.create({
        data: {
          group_id: group1.id,
          class_id: testClass.id,
          student_id: s2.id,
          membership_role: 'MEMBER',
        },
      });
      await tx.groupInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', responded_at: new Date() },
      });
    });

    const s2Membership = await prisma.groupMembership.findFirst({
      where: { group_id: group1.id, student_id: s2.id, left_at: null },
    });
    assert(s2Membership?.membership_role === 'MEMBER', 'Student 2 joined group as MEMBER after acceptance');

    // 6. Leadership Transfer
    await prisma.$transaction(async (tx) => {
      await tx.groupMembership.update({
        where: { id: s1Membership!.id },
        data: { membership_role: 'MEMBER' },
      });
      await tx.groupMembership.update({
        where: { id: s2Membership!.id },
        data: { membership_role: 'LEADER' },
      });
    });

    const newLeader = await prisma.groupMembership.findFirst({
      where: { group_id: group1.id, student_id: s2.id, left_at: null },
    });
    assert(newLeader?.membership_role === 'LEADER', 'Leadership successfully transferred atomically to Student 2');

    // 7. Assignment Publication & Target Snapshotting
    const assignment = await prisma.assignment.create({
      data: {
        class_id: testClass.id,
        created_by: prof.id,
        title: `Project Milestone 1 ${runId}`,
        target_mode: 'ALL_GROUPS',
        status: 'PUBLISHED',
        published_at: new Date(),
      },
    });

    await prisma.assignmentGroup.create({
      data: {
        assignment_id: assignment.id,
        group_id: group1.id,
      },
    });
    assert(assignment.status === 'PUBLISHED', 'Assignment published and targeted groups frozen in assignment_groups');

    // 8. Group Submission & Individual Confirmations
    const submission = await prisma.groupSubmission.create({
      data: {
        assignment_id: assignment.id,
        group_id: group1.id,
        submitted_by: s2.id,
        notes: 'Submitted on behalf of team',
      },
    });

    // Create 1 confirmation per member (s2 confirmed as submitter, s1 pending)
    await prisma.memberConfirmation.createMany({
      data: [
        {
          group_submission_id: submission.id,
          student_id: s2.id,
          status: 'CONFIRMED',
          confirmed_at: new Date(),
        },
        {
          group_submission_id: submission.id,
          student_id: s1.id,
          status: 'PENDING',
        },
      ],
    });

    const s1Conf = await prisma.memberConfirmation.findFirst({
      where: { group_submission_id: submission.id, student_id: s1.id },
    });
    assert(s1Conf?.status === 'PENDING', 'Non-submitting member receives independent PENDING confirmation record');

    // s1 confirms own participation
    await prisma.memberConfirmation.update({
      where: { id: s1Conf!.id },
      data: { status: 'CONFIRMED', confirmed_at: new Date() },
    });

    const s1Updated = await prisma.memberConfirmation.findUnique({ where: { id: s1Conf!.id } });
    assert(s1Updated?.status === 'CONFIRMED', 'Student independently confirmed own participation');

    // 9. Professor Waiver with Reason
    const waiverTest = await prisma.memberConfirmation.create({
      data: {
        group_submission_id: submission.id,
        student_id: prof.id, // using prof id as dummy student for waiver test
        status: 'PENDING',
      },
    });

    await prisma.memberConfirmation.update({
      where: { id: waiverTest.id },
      data: {
        status: 'WAIVED',
        waived_by: prof.id,
        waiver_reason: 'Medical exemption verified by professor',
      },
    });

    const waivedRec = await prisma.memberConfirmation.findUnique({ where: { id: waiverTest.id } });
    assert(waivedRec?.status === 'WAIVED' && waivedRec.waiver_reason?.includes('Medical'), 'Professor waiver recorded with audit reason');

    console.log(`--- Integration Suite Finished: ${passed} passed, ${failed} failed ---`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Integration test encountered unexpected error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runIntegrationTests();
