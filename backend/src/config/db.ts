import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✓ Successfully connected to PostgreSQL Database (Supabase)');
  } catch (error) {
    console.error('✗ Failed to connect to database:', error);
    process.exit(1);
  }
};
