const { PrismaClient } = require('./backend/src/generated/prisma');

const prisma = new PrismaClient();

async function checkUserBalance() {
  try {
    // Find Danis Alfonso
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'danis@alfonso.com' },
          { firstName: 'Danis', lastName: 'Alfonso' }
        ]
      }
    });
    
    if (!user) {
      console.log('❌ User Danis Alfonso not found');
      return;
    }
    
    console.log('👤 Found user:', user.firstName, user.lastName, '(' + user.email + ')');
    console.log('   User ID:', user.id);
    
    // Get user's accounts
    const accounts = await prisma.bankAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n🏦 User accounts:', accounts.length);
    accounts.forEach(account => {
      console.log(`   ${account.currency} Account:`);
      console.log(`     - ID: ${account.id}`);
      console.log(`     - IBAN: ${account.iban}`);
      console.log(`     - Balance: ${account.lastBalance} ${account.currency}`);
      console.log(`     - Status: ${account.status}`);
      console.log(`     - Type: ${account.accountType}`);
      console.log(`     - Updated: ${account.balanceUpdatedAt}`);
      console.log('');
    });
    
    // Specifically check EUR account
    const eurAccount = accounts.find(acc => acc.currency === 'EUR');
    if (eurAccount) {
      console.log('💰 EUR Account Details:');
      console.log('   - Balance:', eurAccount.lastBalance?.toString(), 'EUR');
      console.log('   - Type:', typeof eurAccount.lastBalance);
      console.log('   - Decimal value:', eurAccount.lastBalance);
      console.log('   - Updated:', eurAccount.balanceUpdatedAt);
    } else {
      console.log('❌ No EUR account found for user');
    }
    
  } catch (error) {
    console.error('❌ Database query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserBalance();