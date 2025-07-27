import { obpApiService } from './src/services/obp-api';
import { masterAccountBanking } from './src/services/master-account-banking';
import { prisma } from './src/config/database';

async function resetAccountBalances() {
  console.log('🔄 Starting account reset process...');
  
  try {
    // Step 1: Check current EURBANK master account balance
    console.log('\n📊 Checking current EURBANK master account balance...');
    const accountResult = await obpApiService.makeRequest('/obp/v5.1.0/banks/EURBANK/accounts/f8ea80af-7e83-4211-bca7-d8fc53094c1c/owner/account');
    
    if (accountResult.success && accountResult.data?.balance) {
      const currentBalance = parseFloat(accountResult.data.balance.amount);
      console.log(`💰 Current EURBANK master account balance: ${currentBalance} EUR`);
      
      // Step 2: If balance is not 5000, reset it using sandbox import
      if (currentBalance !== 5000) {
        console.log('🔄 Resetting EURBANK master account to 5000 EUR...');
        
        // Import sandbox data to reset to 5000 EUR
        const importResult = await obpApiService.importSandboxData();
        if (importResult.success) {
          console.log('✅ EURBANK master account reset to 5000 EUR');
        } else {
          console.log('❌ Failed to reset EURBANK master account:', importResult.error);
        }
      } else {
        console.log('✅ EURBANK master account already at 5000 EUR');
      }
    } else {
      console.log('❌ Failed to get EURBANK master account balance:', accountResult.error);
    }
    
    // Step 3: Reset all user virtual account balances to 0
    console.log('\n🧹 Resetting user virtual account balances to 0...');
    
    // Get all virtual accounts
    const virtualAccounts = await prisma.bankAccount.findMany({
      where: {
        accountType: 'virtual_remittance'
      }
    });
    
    console.log(`📊 Found ${virtualAccounts.length} virtual accounts to reset`);
    
    // Reset all balances to 0
    await prisma.$transaction(async (tx) => {
      await tx.bankAccount.updateMany({
        where: {
          accountType: 'virtual_remittance'
        },
        data: {
          lastBalance: 0,
          balanceUpdatedAt: new Date()
        }
      });
      
      // Clear all transactions for fresh start
      await tx.transaction.deleteMany({
        where: {
          type: {
            in: ['DEPOSIT', 'INBOUND_TRANSFER', 'OUTBOUND_TRANSFER']
          }
        }
      });
    });
    
    console.log('✅ All user virtual account balances reset to 0');
    console.log('✅ All test transactions cleared');
    
    // Step 4: Verify final state
    console.log('\n🔍 Final verification...');
    
    // Check EURBANK balance again
    const finalAccountResult = await obpApiService.makeRequest('/obp/v5.1.0/banks/EURBANK/accounts/f8ea80af-7e83-4211-bca7-d8fc53094c1c/owner/account');
    if (finalAccountResult.success && finalAccountResult.data?.balance) {
      const finalBalance = parseFloat(finalAccountResult.data.balance.amount);
      console.log(`💰 Final EURBANK master account balance: ${finalBalance} EUR`);
    }
    
    // Check user balances
    const finalVirtualAccounts = await prisma.bankAccount.findMany({
      where: {
        accountType: 'virtual_remittance'
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    console.log('👥 Final user account balances:');
    for (const account of finalVirtualAccounts) {
      const balance = account.lastBalance ? parseFloat(account.lastBalance.toString()) : 0;
      console.log(`   ${account.user.firstName} ${account.user.lastName} (${account.user.email}): ${balance} ${account.currency}`);
    }
    
    console.log('\n🎉 Account reset completed successfully!');
    console.log('📝 You can now run Import Test Data again to simulate fresh €100 deposits.');
    
  } catch (error) {
    console.error('❌ Error during account reset:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

resetAccountBalances();