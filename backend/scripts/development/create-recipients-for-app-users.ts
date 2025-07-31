#!/usr/bin/env tsx

/**
 * Create Recipients for App Users
 * 
 * Creates beneficiaries in Honduras for the main app users (Danis and Michelle)
 */

import { prisma } from '../../src/config/database';

const appUsers = [
  'danis@alfonso.com',
  'michelle@salgado.com'
];

const hondurasRecipients = [
  {
    id: 'cmdq8krqp0000z8w2ae30nf6t', // Juan Pérez from HNLBANK2
    firstName: 'Juan',
    lastName: 'Pérez',
    accountNumber: '625fede6-0750-485d-acd7-ca85eda46263', // Known working account
    bankName: 'Banco Atlántida (HNLBANK2)',
    bankCode: 'HNLBANK2',
    phone: '+504-9876-5432',
    address: 'Colonia Kennedy, Tegucigalpa, Honduras'
  },
  {
    id: 'cmdq8lnib0003z83pesbhg56c', // María López from HNLBANK2 
    firstName: 'María',
    lastName: 'López',
    accountNumber: 'maria-lopez-hnlbank2-account', // Will need to create
    bankName: 'Banco Atlántida (HNLBANK2)',
    bankCode: 'HNLBANK2', 
    phone: '+504-8765-4321',
    address: 'Barrio La Granja, San Pedro Sula, Honduras'
  },
  {
    id: 'cmdq8lnl30006z83pc9p7y19f', // Carlos Mendoza from HNLBANK2
    firstName: 'Carlos',
    lastName: 'Mendoza', 
    accountNumber: 'carlos-mendoza-hnlbank2-account', // Will need to create
    bankName: 'Banco Atlántida (HNLBANK2)',
    bankCode: 'HNLBANK2',
    phone: '+504-7654-3210',
    address: 'Residencial Las Lomas, Choloma, Honduras'
  }
];

async function createRecipientsForAppUsers() {
  try {
    console.log('👥 Creating Honduras recipients for app users...\n');

    for (const userEmail of appUsers) {
      const user = await prisma.user.findUnique({
        where: { email: userEmail }
      });

      if (!user) {
        console.log(`❌ User not found: ${userEmail}`);
        continue;
      }

      console.log(`📱 Creating recipients for ${user.firstName} ${user.lastName} (${user.email})`);

      // Check if user already has beneficiaries
      const existingBeneficiaries = await prisma.beneficiary.findMany({
        where: { 
          userId: user.id,
          country: 'HN'
        }
      });

      if (existingBeneficiaries.length > 0) {
        console.log(`   ✅ User already has ${existingBeneficiaries.length} Honduras recipients`);
        existingBeneficiaries.forEach(b => {
          console.log(`      - ${b.firstName} ${b.lastName} (${b.accountNumber})`);
        });
        console.log('');
        continue;
      }

      // Create beneficiaries for this user
      for (const recipient of hondurasRecipients) {
        console.log(`   👤 Adding ${recipient.firstName} ${recipient.lastName}...`);
        
        const beneficiary = await prisma.beneficiary.create({
          data: {
            userId: user.id,
            firstName: recipient.firstName,
            lastName: recipient.lastName,
            accountNumber: recipient.accountNumber,
            bankName: recipient.bankName,
            bankCode: recipient.bankCode,
            country: 'HN',
            phone: recipient.phone,
            address: recipient.address
          }
        });

        console.log(`      ✅ Beneficiary created: ${beneficiary.id}`);
      }
      
      console.log('');
    }

    // Summary
    console.log('📊 RECIPIENTS SUMMARY');
    console.log('='.repeat(40));
    
    for (const userEmail of appUsers) {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          beneficiaries: {
            where: { country: 'HN' }
          }
        }
      });

      if (user) {
        console.log(`👤 ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Honduras Recipients: ${user.beneficiaries.length}`);
        user.beneficiaries.forEach(b => {
          console.log(`   - ${b.firstName} ${b.lastName} | ${b.bankName} | ${b.accountNumber}`);
        });
        console.log('');
      }
    }

    console.log('🎉 SUCCESS: App users now have Honduras recipients for EUR → HNL remittances!');
    console.log('📱 Users can now test the EUR → HNL flow in Expo Go');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRecipientsForAppUsers();