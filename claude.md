# Fintech Remittance App - Claude Documentation

## Project Overview
A secure, modern fintech remittance application built with React Native (Expo) and Node.js/Express. This app enables users to send money internationally with robust security features and compliance with financial regulations.

## Phase 1 Status:  COMPLETED

### Architecture
- **Frontend**: React Native with Expo Router v5 (TypeScript)
- **Backend**: Node.js with Express (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with secure password hashing
- **State Management**: Zustand store with expo-secure-store
- **Routing**: File-based routing with Expo Router


## Key Features Implemented

### Backend Features
- **Express Server**: Production-ready with CORS, helmet, and morgan
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT middleware with secure session management
- **User Registration**: Email validation, password hashing with bcrypt
- **User Login**: Secure authentication with token generation
- **Error Handling**: Comprehensive error middleware with proper HTTP status codes
- **Input Validation**: Zod schemas for request validation
- **Environment Config**: Separate dev/staging/prod configurations

### Frontend Features
- **Expo Router v5**: File-based routing with layout system
- **Route Groups**: Organized auth and dashboard flows
- **Authentication Flow**: Protected routes with automatic redirects
- **State Management**: Zustand store with persistent auth state
- **Secure Storage**: expo-secure-store for token storage
- **UI Components**: Reusable Button, Input, and Layout components
- **Form Validation**: Client-side validation with error handling
- **Error Boundaries**: Comprehensive error handling
- **TypeScript**: Full type safety with typed routes
- **Responsive Design**: Optimized for mobile devices

### Database Schema
- **Users**: Complete user model with KYC fields
- **Sessions**: JWT session management
- **Transactions**: Transaction history and status tracking
- **Beneficiaries**: Recipient management for transfers

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

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /health` - Health check endpoint

## 🚨 **FINTECH SAFETY REQUIREMENTS - CRITICAL** 🚨

### 🛡️ **FINANCIAL DATA PROTECTION - MANDATORY**

**🔒 ALL financial operations MUST follow these requirements:**

#### **1. ATOMIC TRANSACTIONS (CRITICAL)**
```typescript
// ✅ CORRECT: All money movements must be atomic
await prisma.$transaction(async (tx) => {
  await tx.wiseAccount.update({ /* debit sender */ });
  await tx.wiseAccount.update({ /* credit recipient */ });
  await tx.wiseTransaction.create({ /* log transaction */ });
});

// ❌ FORBIDDEN: Separate operations can cause money loss
await prisma.wiseAccount.update({ /* debit */ });
// 💥 IF CRASH HERE, MONEY DISAPPEARS! 💥
await prisma.wiseAccount.update({ /* credit */ });
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
# ✅ All tests passing (52/52 or more)
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

### Backend
```bash
cd backend
npm run dev         # Start dev server with hot reload
npm run build       # Build TypeScript
npm run test        # Run tests
npm run lint        # Lint code
```

### Frontend
```bash
cd frontend
npm run dev         # Start Expo development server
npm run ios         # Run on iOS simulator
npm run android     # Run on Android emulator
npm run web         # Run on web browser
```

## Environment Configuration

### Backend (.env)
```env
DATABASE_URL=prisma+postgres://...
JWT_SECRET=your-secret-key
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:8081
```

### Frontend (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_APP_NAME=Remittance App
EXPO_PUBLIC_APP_VERSION=1.0.0
```

## Security Features
- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Zod schemas for all inputs
- **CORS Protection**: Configured for development and production
- **Helmet**: Security headers for Express
- **Secure Storage**: expo-secure-store for sensitive data

## Testing
- **Backend Testing**: Complete Jest + TypeScript + Supertest setup
- **52 Tests Passing**: Password validation, JWT auth, API endpoints
- **Coverage**: Code coverage reporting enabled
- **Security Tests**: Authentication, authorization, input validation
- **Frontend Testing**: Ready for React Native Testing Library setup

## Next Steps (Phase 2)
1. **Multi-Factor Authentication** - TOTP implementation
2. **Enhanced Security** - Rate limiting and advanced validation
3. **Biometric Authentication** - Fingerprint/Face ID
4. **Password Reset Flow** - Secure reset via email
5. **Session Management** - Enhanced session handling

## Running the Application

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Prisma Database**:
   ```bash
   cd backend
   npx prisma dev
   ```

3. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

4. **Start Development Servers**:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:3000` and the frontend on `http://localhost:8081`.

## Important Notes
- Database runs on Prisma dev server (local PostgreSQL)
- JWT tokens are stored securely using expo-secure-store
- All API endpoints use proper error handling and validation
- Frontend includes comprehensive form validation
- Authentication state persists across app restarts

## Phase 1 Completion Status
✅ All Phase 1 requirements have been successfully implemented and tested. The application now has a solid foundation with:
- Complete authentication system
- Secure database setup
- Production-ready backend API
- Modern React Native frontend with Expo Router
- Comprehensive error handling
- Type safety throughout
- Complete testing infrastructure (52 tests passing)

Ready to proceed to Phase 2 for enhanced security features and user experience improvements.