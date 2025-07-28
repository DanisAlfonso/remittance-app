# Development Scripts

These scripts are useful for ongoing development and debugging.

## Available Scripts

### `add-hnl-exchange-rate.ts`
Adds EUR↔HNL exchange rates to OBP-API using real market rates.
- Fetches live exchange rates from currency API
- Configures both EUR→HNL and HNL→EUR conversions
- Required for HNL currency support

**Usage:**
```bash
npx tsx scripts/development/add-hnl-exchange-rate.ts
```

### `check-supported-currencies.ts`
Tests which currencies can create accounts in OBP-API.
- Tests 15+ common international currencies
- Identifies which currencies work for account creation
- Useful for adding new currency support

**Usage:**
```bash
npx tsx scripts/development/check-supported-currencies.ts
```

### `list-all-accounts.ts`
Shows comprehensive overview of all banks, accounts, and master account status.
- Lists all available banks
- Shows master account balances (EUR, HNL)
- Displays current system status
- Essential for system verification

**Usage:**
```bash
npx tsx scripts/development/list-all-accounts.ts
```

## Notes

- All scripts use the same OBP-API configuration as the main application
- Scripts are safe to run multiple times
- Use for development and debugging purposes