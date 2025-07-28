# Archived Development Scripts

These scripts were used during the initial development and setup of the HNL currency support. They are kept for historical reference but are not needed for ongoing development.

## Historical Context

These scripts were created during the process of:
1. Investigating why HNL currency wasn't working in OBP-API
2. Testing different approaches to create and fund HNL accounts
3. Debugging currency conversion issues
4. Setting up the proper HNLBANK account with funds

## Script Categories

### Currency Investigation
- `investigate-hnlbank-requirements.ts` - Initial investigation of HNLBANK requirements
- `find-hnl-account.ts` - Script to locate where HNL accounts were created
- `check-hnl-balance.ts` - Balance checking for HNL accounts
- `check-usd-balance.ts` - Balance checking for USD accounts

### Account Creation Attempts
- `create-and-fund-hnl.ts` - Early attempt to create HNL account
- `create-and-fund-usd.ts` - USD account creation (successful)
- `create-funded-hnl-in-hnlbank.ts` - Attempt to create HNL in HNLBANK
- `create-proper-hnlbank-account.ts` - Final successful HNLBANK account creation

### Funding and Verification
- `fund-hnl-account.ts` - HNL funding attempts
- `fund-hnl-via-backend.ts` - Backend service funding approach
- `complete-hnl-funding.ts` - Funding completion scripts
- `answer-hnl-challenge.ts` - Challenge completion for transactions
- `verify-hnlbank-account.ts` - Account verification
- `verify-new-hnl-account.ts` - New account verification

## Final Outcome

The successful configuration achieved:
- **EURBANK**: €6,500.00 EUR (master account)
- **HNLBANK**: L 30,000.00 HNL (master account) 
- **EUR↔HNL exchange rates configured**
- **Full HNL currency support enabled**

These scripts can be deleted if disk space is needed, but they provide valuable context for how the HNL support was implemented.