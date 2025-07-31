#!/usr/bin/env tsx

/**
 * Check Real Users in Database
 * 
 * See what users actually exist (your real Expo Go users vs test users)
 */

import { prisma } from '../../src/config/database';

async function checkRealUsers() {
  try {
    console.log('👥 Checking all users in database...\n');

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        country: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${allUsers.length} users:\n`);

    allUsers.forEach((user, index) => {
      const isRealUser = ['danis@alfonso.com', 'michelle@salgado.com'].includes(user.email);
      const userType = isRealUser ? '🔥 REAL USER' : '🧪 TEST USER';
      
      console.log(`${index + 1}. ${userType}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Country: ${user.country || 'Not set'}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });

    // Check beneficiaries
    console.log('🎯 Checking beneficiaries (recipients)...\n');
    const beneficiaries = await prisma.beneficiary.findMany({
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true }
        }
      }
    });

    console.log(`Found ${beneficiaries.length} beneficiaries:\n`);

    beneficiaries.forEach((beneficiary, index) => {
      console.log(`${index + 1}. ${beneficiary.firstName} ${beneficiary.lastName}`);
      console.log(`   Owner: ${beneficiary.user.firstName} ${beneficiary.user.lastName} (${beneficiary.user.email})`);
      console.log(`   Bank: ${beneficiary.bankName}`);
      console.log(`   Account: ${beneficiary.accountNumber}`);
      console.log(`   Country: ${beneficiary.country}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealUsers();