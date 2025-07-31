#!/usr/bin/env tsx

/**
 * Create Recipients in HNLBANK (Working Bank) Instead of HNLBANK2
 * 
 * Since HNLBANK2 has currency configuration issues, create recipients in HNLBANK
 */

import { obpApiService } from '../../src/services/obp-api';
import { prisma } from '../../src/config/database';

const recipients = [
  {
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@hnlbank.test',
    userId: 'cmdq8krqp0000z8w2ae30nf6t',
    initialBalance: 5000
  },
  {
    firstName: 'María',
    lastName: 'López',
    email: 'maria.lopez@hnlbank.test',
    userId: 'cmdq8lnib0003z83pesbhg56c',
    initialBalance: 3500
  },
  {
    firstName: 'Carlos',
    lastName: 'Mendoza',
    email: 'carlos.mendoza@hnlbank.test',
    userId: 'cmdq8lnl30006z83pc9p7y19f',
    initialBalance: 7500
  }
];

async function createRecipientsInHNLBANK() {
  try {
    console.log('🏦 Creating recipients in HNLBANK (working bank)...\n');
    console.log('='.repeat(60));

    const createdAccounts = [];

    for (const recipient of recipients) {
      console.log(`👤 Creating ${recipient.firstName} ${recipient.lastName} in HNLBANK...`);
      
      // Create HNL account in HNLBANK (not HNLBANK2)
      const accountResult = await obpApiService.createAccount({
        userId: recipient.userId,
        currency: 'HNL',
        country: 'HN',
        type: 'CURRENT',
        name: `${recipient.firstName} ${recipient.lastName} - Banco Atlántida`,
        bankId: 'HNLBANK' // Use HNLBANK instead of HNLBANK2
      });

      if (!accountResult.success || !accountResult.data) {
        console.error(`   ❌ Failed to create account: ${accountResult.error}`);
        continue;
      }

      const account = accountResult.data;
      console.log(`   ✅ HNLBANK Account: ${account.obp_account_id}`);
      console.log(`   📋 IBAN: ${account.iban}`);
      console.log(`   🏦 Bank: ${account.obp_bank_id}`);

      // Now fund this account immediately using the working HNLBANK system
      console.log(`   💰 Funding account with L.${recipient.initialBalance.toFixed(2)}...`);
      
      const fundingResult = await obpApiService.createTransactionRequest({
        from_bank_id: 'HNLBANK',
        from_account_id: '86563464-f391-4b9f-ab71-fd25385ab466', // HNLBANK Master (working)
        to: {
          bank_id: 'HNLBANK',
          account_id: account.obp_account_id
        },
        value: {
          currency: 'HNL',
          amount: recipient.initialBalance.toString()
        },
        description: `Initial funding for ${recipient.firstName} ${recipient.lastName}`,
        challenge_type: 'SANDBOX_TAN'
      });

      if (fundingResult.success && fundingResult.data) {
        const requestId = fundingResult.data.id;
        const challengeId = (fundingResult.data as any).challenge?.id;
        console.log(`   ✅ Funding request created: ${requestId}`);
        
        // Complete the challenge
        const challengeResult = await (obpApiService as any).makeRequest<{
          id: string;
          status: string;
          transaction_ids: string[];
        }>(`/obp/v5.1.0/banks/HNLBANK/accounts/86563464-f391-4b9f-ab71-fd25385ab466/owner/transaction-request-types/SANDBOX_TAN/transaction-requests/${requestId}/challenge`, {
          method: 'POST',
          body: JSON.stringify({
            id: challengeId || 'SANDBOX_TAN',
            answer: '123'
          })
        });

        if (challengeResult.success && challengeResult.data?.transaction_ids?.length > 0) {
          const transactionId = challengeResult.data.transaction_ids[0];
          console.log(`   ✅ Funding completed: ${transactionId}`);
          
          // Wait for balance update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify balance
          const accountDetails = await obpApiService.getAccountDetails('HNLBANK', account.obp_account_id);
          if (accountDetails.success && accountDetails.data?.balance) {
            const balance = parseFloat(accountDetails.data.balance.amount);
            console.log(`   💰 Final Balance: L.${balance.toFixed(2)} HNL`);
          }
        }
      }

      // Update beneficiaries to use HNLBANK accounts instead of HNLBANK2
      console.log(`   🔄 Updating beneficiaries to use HNLBANK account...`);
      
      const updateResult = await prisma.beneficiary.updateMany({
        where: {
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          country: 'HN'
        },
        data: {
          accountNumber: account.obp_account_id,
          bankName: 'Banco Atlántida (HNLBANK)',
          bankCode: 'HNLBANK'
        }
      });

      console.log(`   ✅ Updated ${updateResult.count} beneficiary records`);

      createdAccounts.push({
        name: `${recipient.firstName} ${recipient.lastName}`,
        accountId: account.obp_account_id,
        iban: account.iban,
        bank: 'HNLBANK'
      });
      
      console.log('');
    }

    // Summary
    console.log('📊 CREATED HNLBANK RECIPIENTS');
    console.log('='.repeat(60));
    
    createdAccounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.name}`);
      console.log(`   Account ID: ${account.accountId}`);
      console.log(`   IBAN: ${account.iban}`);
      console.log(`   Bank: ${account.bank}`);
      console.log('');
    });

    console.log('🎉 SUCCESS: Recipients created in HNLBANK with funds!');
    console.log('💡 Now using HNLBANK instead of problematic HNLBANK2');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRecipientsInHNLBANK();