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

### Project Structure
```
remittance-app/
   frontend/               # Expo React Native app with Expo Router
      app/                 # File-based routing (Expo Router)
         _layout.tsx      # Root layout
         index.tsx        # Main entry with auth routing
         (auth)/          # Auth route group
            _layout.tsx   # Auth layout
            login.tsx     # Login screen
            register.tsx  # Register screen
         (dashboard)/     # Dashboard route group
            _layout.tsx   # Dashboard layout
            index.tsx     # Dashboard home
            profile.tsx   # Profile screen
            transactions.tsx  # Transactions screen
            beneficiaries.tsx # Beneficiaries screen
      components/         # Reusable UI components
         ui/              # UI component library
            Button.tsx
            SimpleInput.tsx
         ErrorBoundary.tsx
      lib/                # Library functions
         api.ts           # API client
         auth.ts          # Auth utilities
      types/              # TypeScript type definitions
         auth.ts
         index.ts
      utils/              # Utility functions
         config.ts        # Environment configuration
         validation.ts    # Form validation
      hooks/              # Custom React hooks
      constants/          # App constants
      assets/             # Static assets
      package.json
   backend/                # Express.js API server
      src/
         config/         # Database and environment config
         middleware/     # Auth and error handling middleware
         routes/         # API routes
         utils/          # Utility functions
         __tests__/      # Test files
         index.ts
      prisma/             # Database schema and migrations
      package.json
   shared/                 # Shared types and utilities
   package.json            # Root workspace config
```

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

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /health` - Health check endpoint

## Development Standards & Quality Assurance

### 🎯 **MANDATORY WORKFLOW FOR ALL CODE CHANGES**

**After ANY code modification, creation, or generation, Claude Code MUST:**

1. **Code Quality Check**:
   ```bash
   npm run lint        # Fix all linting issues
   npm run typecheck   # Ensure no TypeScript errors
   npm run build       # Verify successful compilation
   ```

2. **Test Verification**:
   ```bash
   npm test           # Run ALL tests - must be 100% passing
   ```

3. **New Functionality Requirements**:
   - Write comprehensive unit tests for ALL new functions/features
   - Achieve 100% test coverage for critical paths
   - Include edge cases and error scenarios
   - Follow existing test patterns and mocking strategies

### 🎨 **UI/UX EXCELLENCE STANDARDS**

**For ALL UI-related code, ensure:**

- **Modern Design**: Clean, professional, contemporary aesthetics
- **Perfect Typography**: Consistent font sizes, weights, spacing
- **Color Harmony**: Professional color palette with proper contrast
- **Responsive Layout**: Flawless on all screen sizes and orientations
- **Smooth Animations**: 60fps transitions and micro-interactions
- **Accessibility**: WCAG 2.1 AA compliance, screen reader support
- **Loading States**: Elegant loading indicators and skeleton screens
- **Error Handling**: Beautiful error states with helpful messaging
- **Consistent Spacing**: Perfect margins, padding, and alignment
- **Professional Polish**: Every pixel matters - pixel-perfect implementation

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