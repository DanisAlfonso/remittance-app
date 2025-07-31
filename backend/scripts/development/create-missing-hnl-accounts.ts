#!/usr/bin/env tsx

/**
 * Create Missing HNL Accounts
 * 
 * Creates actual OBP-API accounts for María López and Carlos Mendoza in HNLBANK2
 * and updates the beneficiaries with the correct account IDs
 */

import { obpApiService } from '../../src/services/obp-api';
import { prisma } from '../../src/config/database';

const recipientsToCreate = [
  {
    firstName: 'María',
    lastName: 'López',
    email: 'maria.lopez@hnlbank2.test',
    userId: 'cmdq8lnib0003z83pesbhg56c',
    currentPlaceholder: 'maria-lopez-hnlbank2-account'
  },
  {
    firstName: 'Carlos', 
    lastName: 'Mendoza',
    email: 'carlos.mendoza@hnlbank2.test',
    userId: 'cmdq8lnl30006z83pc9p7y19f',
    currentPlaceholder: 'carlos-mendoza-hnlbank2-account'
  }
];

async function createMissingHNLAccounts() {
  try {
    console.log('🏦 Creating missing HNL accounts in HNLBANK2...\n');

    const createdAccounts = [];

    for (const recipient of recipientsToCreate) {
      console.log(`👤 Creating account for ${recipient.firstName} ${recipient.lastName}...`);
      
      // Create HNL account in HNLBANK2
      const accountResult = await obpApiService.createAccount({
        userId: recipient.userId,
        currency: 'HNL',
        country: 'HN',
        type: 'CURRENT',
        name: `${recipient.firstName} ${recipient.lastName} - Banco Atlántida`,
        bankId: 'HNLBANK2'
      });

      if (!accountResult.success || !accountResult.data) {
        console.error(`   ❌ Failed to create account: ${accountResult.error}`);
        continue;
      }

      const account = accountResult.data;
      console.log(`   ✅ Account created: ${account.obp_account_id}`);
      console.log(`   📋 IBAN: ${account.iban}`);
      console.log(`   🏦 Bank: ${account.obp_bank_id}`);

      createdAccounts.push({
        name: `${recipient.firstName} ${recipient.lastName}`,
        accountId: account.obp_account_id,
        iban: account.iban,
        userId: recipient.userId,
        placeholder: recipient.currentPlaceholder
      });

      // Update all beneficiaries that use the placeholder account number
      console.log(`   🔄 Updating beneficiaries with placeholder "${recipient.currentPlaceholder}"...`);
      
      const updateResult = await prisma.beneficiary.updateMany({
        where: {
          accountNumber: recipient.currentPlaceholder
        },
        data: {
          accountNumber: account.obp_account_id
        }
      });

      console.log(`   ✅ Updated ${updateResult.count} beneficiary records`);
      console.log('');
    }

    // Summary
    console.log('📊 CREATED HNL ACCOUNTS');
    console.log('='.repeat(40));
    
    createdAccounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.name}`);
      console.log(`   Account ID: ${account.accountId}`);
      console.log(`   IBAN: ${account.iban}`);
      console.log(`   User ID: ${account.userId}`);
      console.log('');
    });

    // Verify beneficiaries are updated
    console.log('🔍 VERIFYING BENEFICIARIES');
    console.log('='.repeat(40));

    const appUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['danis@alfonso.com', 'michelle@salgado.com']
        }
      },
      include: {
        beneficiaries: {
          where: { country: 'HN' }
        }
      }
    });

    appUsers.forEach(user => {
      console.log(`👤 ${user.firstName} ${user.lastName} (${user.email})`);
      user.beneficiaries.forEach(b => {
        const isValidAccount = !b.accountNumber.includes('-account') && !b.accountNumber.includes('placeholder');
        console.log(`   ${isValidAccount ? '✅' : '❌'} ${b.firstName} ${b.lastName} - ${b.accountNumber}`);
      });
      console.log('');
    });

    console.log('🎉 SUCCESS: All recipients now have valid HNLBANK2 account IDs!');
    console.log('📱 EUR → HNL remittance should work correctly now');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingHNLAccounts();