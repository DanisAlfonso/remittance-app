import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function clearAllUsers() {
  try {
    console.log('🚨 WARNING: This will delete ALL user data permanently!');
    console.log('Starting user data cleanup...');

    // Delete in proper order due to foreign key constraints
    const deleteOperations = await prisma.$transaction([
      prisma.bankTransaction.deleteMany(),
      prisma.bankAccount.deleteMany(),
      prisma.internalTransfer.deleteMany(),
      prisma.transaction.deleteMany(),
      prisma.beneficiary.deleteMany(),
      prisma.session.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    console.log('✅ All user data cleared successfully!');
    console.log('Deleted records:', {
      bankTransactions: deleteOperations[0].count,
      bankAccounts: deleteOperations[1].count,
      internalTransfers: deleteOperations[2].count,
      transactions: deleteOperations[3].count,
      beneficiaries: deleteOperations[4].count,
      sessions: deleteOperations[5].count,
      users: deleteOperations[6].count,
    });
  } catch (error) {
    console.error('❌ Error clearing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllUsers();