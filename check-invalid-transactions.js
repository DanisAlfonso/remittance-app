const { PrismaClient } = require('./backend/src/generated/prisma');

const prisma = new PrismaClient();

async function checkInvalidTransactions() {
  try {
    console.log('🔍 Checking for transactions with invalid transaction types...');
    
    // Get all transactions
    const allTransactions = await prisma.$queryRaw`
      SELECT id, type, "userId", amount, currency, "createdAt" 
      FROM transactions 
      WHERE type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'EXCHANGE', 'ACCOUNT_CREATION', 'INBOUND_TRANSFER', 'OUTBOUND_TRANSFER')
    `;
    
    console.log(`❗ Found ${allTransactions.length} transactions with invalid types:`)
    allTransactions.forEach(tx => {
      console.log(`   - ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount} ${tx.currency}`);
    });
    
    if (allTransactions.length > 0) {
      console.log('\n🔧 Fixing invalid transaction types...');
      
      // Update INTERNATIONAL_TRANSFER to OUTBOUND_TRANSFER
      const updateResult = await prisma.$executeRaw`
        UPDATE transactions 
        SET type = 'OUTBOUND_TRANSFER' 
        WHERE type = 'INTERNATIONAL_TRANSFER'
      `;
      
      console.log(`✅ Updated ${updateResult} transactions from INTERNATIONAL_TRANSFER to OUTBOUND_TRANSFER`);
      
      // Check for any other invalid types and update them too
      const otherInvalidTypes = await prisma.$executeRaw`
        UPDATE transactions 
        SET type = 'TRANSFER' 
        WHERE type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'EXCHANGE', 'ACCOUNT_CREATION', 'INBOUND_TRANSFER', 'OUTBOUND_TRANSFER')
      `;
      
      console.log(`✅ Updated ${otherInvalidTypes} other invalid transaction types to TRANSFER`);
    } else {
      console.log('✅ No invalid transaction types found');
    }
    
  } catch (error) {
    console.error('❌ Error checking transactions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvalidTransactions();