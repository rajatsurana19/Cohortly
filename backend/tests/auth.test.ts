import { prisma } from '../src/config/db';
import { hashPassword, comparePassword } from '../src/utils/password';
import { signAccessToken, verifyAccessToken } from '../src/utils/jwt';

async function runAuthTests() {
  console.log('--- Starting Authentication & Core Unit Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Password hashing test
    const raw = 'SecurePassword123!';
    const hashed = await hashPassword(raw);
    assert(hashed !== raw, 'Password is properly hashed');
    assert(await comparePassword(raw, hashed), 'Password comparison succeeds with correct password');
    assert(!(await comparePassword('WrongPass', hashed)), 'Password comparison fails with wrong password');

    // 2. JWT Sign & Verify test
    const payload = {
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'test@cohortly.edu',
      role: 'STUDENT' as const,
      status: 'ACTIVE' as const,
    };
    const token = signAccessToken(payload);
    assert(typeof token === 'string' && token.length > 20, 'JWT access token generated');
    const decoded = verifyAccessToken(token);
    assert(decoded.userId === payload.userId, 'JWT token decodes correct userId');
    assert(decoded.email === payload.email, 'JWT token decodes correct email');
    assert(decoded.role === payload.role, 'JWT token decodes correct role');

    // 3. Database connection test
    const dbCheck = await prisma.$queryRaw`SELECT 1 as result`;
    assert(Array.isArray(dbCheck) && (dbCheck[0] as any).result === 1, 'PostgreSQL database is connected and responsive');

    // 4. Admin user seeded test
    const admin = await prisma.user.findUnique({ where: { email: 'admin@cohortly.edu' } });
    assert(admin !== null && admin.role === 'PLATFORM_ADMIN', 'Platform Administrator exists in database');

    console.log(`--- Finished Tests: ${passed} passed, ${failed} failed ---`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAuthTests();
