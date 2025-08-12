# Fintech Remittance App - Claude Documentation

## 🚨 **CRITICAL DEVELOPMENT PRINCIPLES** 🚨

### **NEVER LIE - NEVER MAKE THINGS UP**
- **Research First**: Always research from correct, authoritative sources when implementing unknown functionality
- **Honest Assessment**: Never claim something is "real", "production-grade", or "properly implemented" without verification
- **OBP-API Compliance**: Strictly follow official OBP-API documentation and standards for all banking integrations
- **Admit Limitations**: Clearly state when something is simulated, prototype, or incomplete
- **Verify Claims**: Double-check all technical statements against actual implementation and standards


## 🔑 **CRITICAL AUTHENTICATION CREDENTIALS**

**NEVER GUESS THESE - ALWAYS USE EXACT VALUES:**

### **App User Credentials (Expo Go)**
- **Password for ALL app users**: `Wjgnc123@`
- **Users**: 
  - Danis Alfonso – danis@alfonso.com
  - Michelle Salgado – michelle@salgado.com

### **OBP-API Bootstrap Credentials**
- **Username**: `bootstrap`
- **Password**: `BootstrapPass123!`

### **Current OBP Consumer Registration**
- **Consumer Key**: `mwtu30rvv5u3q40swprmrlc34llkjgb4xvhawrme`
- **Consumer Secret**: `bzz1ceaup2wtptptjok5yg22vti5mi5q3ei5ucfc`
- **OBP-API Base URL**: `http://127.0.0.1:8080`

### **OBP-API VERSION REQUIREMENT**
- **API Version**: `v5.1.0` - ALWAYS use this exact version in all endpoints
- **Base API Path**: `/obp/v5.1.0/` - NEVER use other versions like v2.1.0, v3.0.0, etc.
- **All endpoints must use**: `http://127.0.0.1:8080/obp/v5.1.0/...`

---

## Project Overview
A secure, modern fintech remittance application built with React Native (Expo) and Node.js/Express. This app enables users to have european IBAN and to send money internationally with robust security features and compliance with financial regulations.

### Current Architecture
- **Frontend**: React Native with Expo Router v5 (TypeScript)
- **Backend**: Node.js with Express (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with secure password hashing
- **Banking**: OBP-API v5.1.0 integration with master account architecture
- **Cards**: Stripe Issuing for virtual card management

### 🔒 **FINANCIAL SAFETY IMPLEMENTATIONS**

#### **Atomic Money Transfers** ✅
- All transfer operations use `prisma.$transaction()` 
- Prevents money disappearing if system crashes mid-transfer
- Includes balance validation and rollback on errors
- Files: `src/services/transfer.ts:489` (storeTransfer), `src/services/transfer.ts:751` (updateTransferStatus)

#### **Database Financial Constraints** ✅  
- `positive_balance_check`: Prevents negative account balances
- `non_zero_amount_check`: Blocks zero-amount transactions
- `positive_transfer_amount_check`: Ensures positive transfer amounts
- `non_negative_fee_check`: Validates all fees are non-negative
- Applied via migration: `20250719115548_add_financial_safety_constraints`

#### **Production-Safe Migrations** ✅
- Proper Prisma migration system implemented
- Dangerous `--force-reset` commands removed
- Production deployment script with confirmation: `scripts/deploy-production-migrations.sh`
- Safe test setup script: `scripts/setup-test-db.sh`

#### **Database Backup System** ✅
- Automated backup script: `scripts/create-database-backup.sh`
- Compressed backups with integrity verification
- 30-day retention policy
- Ready for cloud storage integration


## 🚨 **FINTECH SAFETY REQUIREMENTS - CRITICAL** 🚨

### 🛡️ **FINANCIAL DATA PROTECTION - MANDATORY**

**🔒 ALL financial operations MUST follow these requirements:**

#### **1. ATOMIC TRANSACTIONS (CRITICAL)**
```typescript
// ✅ CORRECT: All money movements must be atomic
await prisma.$transaction(async (tx) => {
  await tx.bankAccount.update({ /* debit sender */ });
  await tx.bankAccount.update({ /* credit recipient */ });
  await tx.transaction.create({ /* log transaction */ });
});

// ❌ FORBIDDEN: Separate operations can cause money loss
await prisma.bankAccount.update({ /* debit */ });
// 💥 IF CRASH HERE, MONEY DISAPPEARS! 💥
await prisma.bankAccount.update({ /* credit */ });
```

#### **2. DATABASE MIGRATIONS (CRITICAL)**
```bash
# ✅ SAFE: Use proper migrations
npx prisma migrate dev --name "feature_name"
npx prisma migrate deploy  # Production

# 🚨 FORBIDDEN: NEVER use --force-reset in production
# npx prisma db push --force-reset  # DESTROYS ALL DATA!
```

#### **3. FINANCIAL CONSTRAINTS (CRITICAL)**
- **Negative balances BLOCKED** by database constraints
- **Zero transactions BLOCKED** by database constraints  
- **All fees must be non-negative**
- **Exchange rates must be positive**

#### **4. BACKUP REQUIREMENTS (CRITICAL)**
- **Automated daily backups** with verification
- **Point-in-time recovery** capabilities
- **Cross-region replication** for disaster recovery
- **Regular restore testing** (monthly minimum)

### 🎯 **MANDATORY WORKFLOW FOR ALL CODE CHANGES**

**After ANY code modification, creation, or generation, Claude Code MUST:**

1. **Financial Safety Check**:
   - ✅ Are all money movements in `$transaction()`?
   - ✅ Are database constraints preventing negative balances?
   - ✅ Are migrations used instead of `--force-reset`?
   - ✅ Are backups working and tested?

2. **Code Quality Check**:
   ```bash
   npm run lint        # Fix all linting issues
   npm run typecheck   # Ensure no TypeScript errors
   npm run build       # Verify successful compilation
   ```

3. **Test Verification**:
   ```bash
   npm test           # Run ALL tests - must be 100% passing
   ```

4. **New Functionality Requirements**:
   - Write comprehensive unit tests for ALL new functions/features
   - Achieve 100% test coverage for critical paths
   - Include edge cases and error scenarios
   - Follow existing test patterns and mocking strategies

### 🎨 **UI/UX EXCELLENCE STANDARDS** 🎨

## 🌟 **PERFECT UI/UX IS A TOP PRIORITY** 🌟

**UI/UX excellence is NOT optional - it is MANDATORY for every screen, component, and interaction.**

**🏆 GOAL: Create a UI so beautiful, intuitive, and polished that users are delighted by every interaction.**

---

### 🎯 **FINTECH-GRADE UI EXCELLENCE REQUIREMENTS**

**Every UI element MUST meet these premium standards:**

#### **1. 🎨 VISUAL EXCELLENCE (MANDATORY)**
- **Stunning Modern Design**: Contemporary, sophisticated, premium fintech aesthetics
- **Perfect Visual Hierarchy**: Clear information architecture with proper emphasis
- **Consistent Design Language**: Unified visual system across all screens
- **Premium Color Palette**: Sophisticated colors with perfect contrast ratios
- **Elegant Typography**: Beautiful, readable fonts with perfect spacing
- **Professional Iconography**: Consistent, meaningful icons throughout
- **Luxurious Shadows & Elevation**: Subtle depth that enhances usability
- **Perfect Alignment**: Every element positioned with mathematical precision

#### **2. 📐 SPACING & LAYOUT PERFECTION**
- **Golden Ratio Spacing**: Use 8px grid system (8, 16, 24, 32, 40, 48, 64px)
- **Consistent Margins**: Perfect gutters and padding throughout
- **Optimal Content Density**: Never cramped, never sparse
- **Responsive Excellence**: Flawless on all screen sizes and orientations
- **Safe Area Compliance**: Perfect handling of notches, status bars, navigation
- **Proper Content Hierarchy**: Clear distinction between primary, secondary, tertiary elements

#### **3. 🎭 INTERACTION EXCELLENCE**
- **Buttery Smooth Animations**: 60fps transitions, no janky movements
- **Delightful Micro-interactions**: Thoughtful feedback for every user action
- **Intuitive Gestures**: Natural swipes, taps, and navigation patterns
- **Instant Feedback**: Immediate visual response to all interactions
- **Loading State Artistry**: Beautiful loading indicators, skeleton screens, progressive loading
- **Error State Beauty**: Elegant, helpful error messages with clear next steps

#### **4. 🎯 USER EXPERIENCE EXCELLENCE**
- **Effortless Navigation**: Users should never be confused about where they are
- **One-Handed Usability**: All primary actions accessible with thumb
- **Cognitive Load Minimization**: Simple, clear interfaces that don't require thinking
- **Progressive Disclosure**: Show only what users need, when they need it
- **Smart Defaults**: Pre-fill forms intelligently, remember user preferences
- **Contextual Help**: Subtle guidance without being intrusive

#### **5. 🔥 FINTECH-SPECIFIC EXCELLENCE**
- **Trust-Building Design**: Visual cues that reinforce security and reliability
- **Financial Data Clarity**: Numbers, amounts, and transactions are crystal clear
- **Status Communication**: Clear visual indicators for all transaction states
- **Secure Interaction Patterns**: Visual confirmation for sensitive actions
- **Professional Credibility**: Design that builds confidence in financial services
- **Regulatory Compliance**: Accessible design meeting financial industry standards

#### **6. 📱 TECHNICAL EXCELLENCE**
- **Performance Optimization**: Smooth scrolling, fast rendering, minimal memory usage
- **Accessibility Excellence**: WCAG 2.1 AA compliance, screen reader support
- **Dark Mode Excellence**: Beautiful both in light and dark themes
- **Internationalization Ready**: Design that works for multiple languages
- **Platform Consistency**: Feel native to iOS and Android respectively

---

### 🏗️ **DESIGN SYSTEM REQUIREMENTS**

**Create and maintain a consistent design system:**

#### **Color System**
```typescript
// Primary Colors (Professional Blue Palette)
Primary: {
  50: '#F0F9FF',   // Lightest blue tint
  100: '#E0F2FE',  // Very light blue
  500: '#3B82F6',  // Main brand blue
  600: '#2563EB',  // Darker blue for hover
  900: '#1E3A8A'   // Darkest blue for text
}

// Semantic Colors
Success: '#10B981',  // Fresh green
Warning: '#F59E0B',  // Warm amber
Error: '#EF4444',    // Clear red
Info: '#3B82F6'      // Brand blue
```

#### **Typography Scale**
```typescript
// Font Sizes (Perfect Scale)
Display: '40px',     // Hero headlines
H1: '32px',          // Page titles
H2: '24px',          // Section headers
H3: '20px',          // Subsection headers
Body: '16px',        // Main content
Caption: '14px',     // Secondary text
Small: '12px'        // Metadata
```

#### **Spacing Scale**
```typescript
// 8px Grid System
Space: {
  1: '4px',    // Tiny gaps
  2: '8px',    // Base unit
  3: '12px',   // Small spacing
  4: '16px',   // Medium spacing
  6: '24px',   // Large spacing
  8: '32px',   // Extra large
  12: '48px',  // Section spacing
  16: '64px'   // Page spacing
}
```

---

### 🎬 **ANIMATION & INTERACTION STANDARDS**

**Every animation must be purposeful and delightful:**

#### **Timing Functions**
```typescript
// Easing Curves
easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',      // Fast start, slow end
easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)', // Smooth both ways
spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'   // Bouncy feel
```

#### **Duration Standards**
```typescript
// Animation Durations
micro: 150,      // Button hover, icon changes
small: 250,      // Modal open/close, page transitions
medium: 400,     // Screen transitions, major state changes
large: 600       // Complex animations, onboarding
```

---

### 🔍 **UI/UX QUALITY CHECKLIST**

**Before considering ANY UI work complete, verify ALL of these:**

#### **Visual Quality ✅**
- [ ] Design looks professional and modern
- [ ] Typography is beautiful and readable
- [ ] Colors create proper hierarchy and contrast
- [ ] Spacing feels balanced and purposeful
- [ ] Icons are consistent and meaningful
- [ ] No visual bugs or alignment issues

#### **Interaction Quality ✅**
- [ ] All buttons have proper hover/press states
- [ ] Loading states are elegant and informative
- [ ] Error states are helpful and beautiful
- [ ] Animations feel smooth and natural
- [ ] Touch targets are appropriately sized (44px minimum)
- [ ] Gestures work intuitively

#### **User Experience Quality ✅**
- [ ] User flow is logical and effortless
- [ ] Information architecture is clear
- [ ] Users can complete tasks without confusion
- [ ] No cognitive overload on any screen
- [ ] Accessibility requirements are met
- [ ] Performance is smooth and responsive

#### **Fintech Quality ✅**
- [ ] Design builds trust and confidence
- [ ] Financial data is presented clearly
- [ ] Security actions have proper confirmation
- [ ] Transaction states are visually distinct
- [ ] Professional appearance suitable for financial services

---

### 🎯 **MANDATORY UI/UX WORKFLOW**

**For EVERY UI-related task:**

1. **Design First**: Plan the visual hierarchy and user flow
2. **Build with Excellence**: Implement with pixel-perfect precision
3. **Test Thoroughly**: Verify on multiple devices and scenarios
4. **Polish Relentlessly**: Refine until it's genuinely beautiful
5. **Validate Experience**: Ensure users can complete tasks effortlessly

**REMEMBER: UI/UX excellence is not just about making things look good - it's about creating an experience so delightful that users love using the app.**

### 📏 **Code Quality Standards**

- **Perfect Formatting**: Consistent indentation, line breaks, spacing
- **TypeScript Strict**: Full type safety, no `any` types
- **ESLint Clean**: Zero warnings or errors
- **Performance**: Optimized for speed and memory usage
- **Security**: Follow fintech security best practices
- **Documentation**: Clear comments for complex logic
- **Naming**: Descriptive, consistent variable/function names

### ⚡ **Quality Gates - ALL MUST PASS**

Before considering any task complete:

```bash
# 1. Code Quality
npm run lint && npm run typecheck && npm run build

# 2. Test Suite
npm test

# 3. Verify Output
# ✅ 0 ESLint errors/warnings
# ✅ 0 TypeScript errors  
# ✅ Successful build
# ✅ All tests passing
```

### 🚀 **Testing Philosophy**

- **Test Everything**: Every function, component, API endpoint
- **Test-Driven Development**: Write tests first when possible
- **Comprehensive Coverage**: Happy path, edge cases, error scenarios
- **Realistic Testing**: Use proper mocks that mirror real behavior
- **Fast & Reliable**: Tests should run quickly and consistently
- **Maintainable**: Tests should be easy to update when code changes

## Development Commands

### Root Level
```bash
npm run dev          # Start both frontend and backend
npm run build        # Build all packages
npm test            # Run all tests
npm run lint        # Lint all packages
npm run typecheck   # Type check all packages
```


