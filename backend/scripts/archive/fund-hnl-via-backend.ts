#!/usr/bin/env tsx

/**
 * Fund HNL Account via Backend Service
 * 
 * Use the backend's fundAccountForTesting method to add funds
 */

import { masterAccountBanking } from './src/services/master-account-banking';
import { prisma } from './src/config/database';

async function fundHNLViaBackend() {
  try {
    console.log('💰 Funding HNL account via backend service...');
    
    // Find or create a test user
    let testUser = await prisma.user.findFirst({
      where: { email: 'bootstrap@hnlbank.test' }
    });
    
    if (!testUser) {
      console.log('👤 Creating test user...');
      testUser = await prisma.user.create({
        data: {
          email: 'bootstrap@hnlbank.test',
          firstName: 'Bootstrap',
          lastName: 'HNL User',
          password: 'BootstrapPass123!',
        }
      });
    }
    
    console.log(`✅ Using user: ${testUser.id}`);
    
    // Check if user has an HNL account
    let userAccounts = await masterAccountBanking.getUserAccountBalances(testUser.id);
    let hnlAccount = userAccounts.find(acc => acc.currency === 'HNL');
    
    if (!hnlAccount) {
      console.log('🏦 Creating HNL virtual account for user...');
      hnlAccount = await masterAccountBanking.createVirtualAccount(testUser.id, 'HNL', 'HNL Test Account');
      console.log(`✅ Created HNL account with IBAN: ${hnlAccount.virtualIBAN}`);
    }
    
    console.log(`💰 Current HNL balance: L ${hnlAccount.balance}`);
    
    // Fund the account
    console.log('💸 Adding L 10,000 to account...');
    const fundingResult = await masterAccountBanking.fundAccountForTesting(testUser.id, 'HNL', 10000);
    
    if (fundingResult.status === 'COMPLETED') {
      console.log('✅ Funding completed successfully!');
      console.log(`📋 Reference: ${fundingResult.referenceNumber}`);
      
      // Check updated balance
      const updatedAccounts = await masterAccountBanking.getUserAccountBalances(testUser.id);
      const updatedHnlAccount = updatedAccounts.find(acc => acc.currency === 'HNL');
      
      if (updatedHnlAccount) {
        console.log(`💰 New HNL balance: L ${updatedHnlAccount.balance}`);
        console.log(`🏦 Account IBAN: ${updatedHnlAccount.virtualIBAN}`);
        console.log(`🏦 Bank Name: ${updatedHnlAccount.bankName}`);
        console.log(`🏦 BIC: ${updatedHnlAccount.bic}`);
        
        console.log('\n🎉 SUCCESS: HNL account with L 10,000 is ready!');
        console.log('\n📊 Account Summary:');
        console.log(`  • Currency: HNL (Honduran Lempiras)`);
        console.log(`  • Balance: L ${updatedHnlAccount.balance}`);
        console.log(`  • IBAN: ${updatedHnlAccount.virtualIBAN}`);
        console.log(`  • Status: ${updatedHnlAccount.status}`);
        console.log(`  • Master Account: ${updatedHnlAccount.masterAccountReference}`);
        
      } else {
        console.log('⚠️ Could not retrieve updated balance');
      }
      
    } else {
      console.log('❌ Funding failed:', fundingResult);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fundHNLViaBackend();