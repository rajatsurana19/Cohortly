import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export const connectDatabase = async (maxRetries = 5, initialDelayMs = 2000): Promise<boolean> => {
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      console.log('Successfully connected to PostgreSQL Database (Supabase)');
      return true;
    } catch (error: any) {
      console.warn(
        `[Database Connection] Attempt ${attempt}/${maxRetries} failed: ${error.message || error}`
      );
      if (attempt < maxRetries) {
        console.log(`Retrying database connection in ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * 1.5, 10000);
      }
    }
  }

  console.error(
    'Warning: Initial database connection could not be established. The server will remain running and Prisma will attempt connecting dynamically on incoming requests.'
  );
  return false;
};
