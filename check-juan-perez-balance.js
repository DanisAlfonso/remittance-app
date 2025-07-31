const { PrismaClient } = require('./backend/src/generated/prisma');

const prisma = new PrismaClient();

async function checkJuanPerezBalance() {
  try {
    console.log('🔍 Checking Juan Pérez account balance...');
    
    // First check if Juan Pérez exists as a user
    const juanUser = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: 'Juan', lastName: 'Pérez' },
          { firstName: 'Juan', lastName: 'Perez' },
          { email: { contains: 'juan' } }
        ]
      }
    });
    
    if (juanUser) {
      console.log('👤 Found Juan Pérez as user:', juanUser.firstName, juanUser.lastName, '(' + juanUser.email + ')');
      
      // Get his accounts
      const accounts = await prisma.bankAccount.findMany({
        where: { userId: juanUser.id },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('\n🏦 Juan Pérez accounts:', accounts.length);
      accounts.forEach(account => {
        console.log(`   ${account.currency} Account:`);
        console.log(`     - ID: ${account.id}`);
        console.log(`     - IBAN: ${account.iban}`);
        console.log(`     - Balance: ${account.lastBalance} ${account.currency}`);
        console.log(`     - Status: ${account.status}`);
        console.log(`     - Updated: ${account.balanceUpdatedAt}`);
        console.log('');
      });
    } else {
      console.log('❌ Juan Pérez not found as a user. He might be a recipient in HNLBANK2.');
    }
    
    // Check for Juan Pérez in the beneficiaries/recipients table
    const beneficiaries = await prisma.beneficiary.findMany({
      where: {
        OR: [
          { firstName: 'Juan', lastName: 'Pérez' },
          { firstName: 'Juan', lastName: 'Perez' }
        ]
      }
    });
    
    if (beneficiaries.length > 0) {
      console.log('📋 Found Juan Pérez as beneficiary:');
      beneficiaries.forEach(ben => {
        console.log(`   - Name: ${ben.firstName} ${ben.lastName}`);
        console.log(`   - Bank: ${ben.bankName}`);
        console.log(`   - Account: ${ben.accountNumber}`);
        console.log(`   - Country: ${ben.country}`);
        console.log('');
      });
    }
    
    // Since Juan Pérez is likely a test account in HNLBANK2 (OBP-API), 
    // let's check recent transactions to him
    console.log('💸 Recent transactions to Juan Pérez:');
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { providerReference: { contains: 'Juan' } },
          { providerReference: { contains: 'PEREZ' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`Found ${recentTransactions.length} transactions:`);
    recentTransactions.forEach(tx => {
      console.log(`   - ${tx.createdAt}: ${tx.amount} ${tx.currency} - ${tx.status}`);
      console.log(`     Ref: ${tx.referenceNumber}`);
      console.log(`     Provider Ref: ${tx.providerReference}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error checking Juan Pérez balance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJuanPerezBalance();