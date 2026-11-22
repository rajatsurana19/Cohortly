import { prisma } from '../src/config/db';
import { hashPassword } from '../src/utils/password';

async function seed() {
  console.log('Seeding initial platform administrator...');

  const adminEmail = 'admin@cohortly.edu';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await hashPassword('CohortlyAdmin2026!');
    const admin = await prisma.user.create({
      data: {
        full_name: 'Platform Administrator',
        email: adminEmail,
        password_hash: passwordHash,
        role: 'PLATFORM_ADMIN',
        status: 'ACTIVE',
      },
    });
    console.log(`✓ Admin user created: ${admin.email} / CohortlyAdmin2026!`);
  } else {
    console.log(`✓ Admin user already exists: ${existingAdmin.email}`);
  }

  // Create default Academic Year
  const currentYearName = '2026-2027';
  const existingYear = await prisma.academicYear.findFirst({
    where: { name: currentYearName },
  });

  if (!existingYear) {
    const academicYear = await prisma.academicYear.create({
      data: {
        name: currentYearName,
        start_date: new Date('2026-07-01'),
        end_date: new Date('2027-06-30'),
        status: 'ACTIVE',
      },
    });
    console.log(`✓ Academic Year created: ${academicYear.name}`);
  } else {
    console.log(`✓ Academic Year already exists: ${existingYear.name}`);
  }

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Seeding error:', e);
  process.exit(1);
});
