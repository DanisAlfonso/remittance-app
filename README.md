# RemitPay - Fintech Remittance Application

A modern, secure mobile application for international money transfers. Built with React Native, Node.js, and enterprise-grade security practices.

![Tech Stack](https://img.shields.io/badge/React%20Native-0.79.5-blue)
![Tech Stack](https://img.shields.io/badge/Expo-SDK%2053-blue)
![Tech Stack](https://img.shields.io/badge/Node.js-20.x-green)
![Tech Stack](https://img.shields.io/badge/TypeScript-5.x-blue)
![Tests](https://img.shields.io/badge/tests-52%20passing-success)

## 🚀 Features

### Core Functionality
- 💸 **International Money Transfers** - Send money worldwide with real-time exchange rates
- 🏦 **Multi-Currency Accounts** - Virtual IBAN accounts via Wise Platform integration
- 👥 **P2P Transfers** - Send money instantly to other app users
- 📱 **Biometric Authentication** - Face ID, Touch ID, and Fingerprint support
- 🧾 **Transaction History** - Complete history with receipts and detailed tracking

### Security & Compliance
- 🔒 **JWT-based Authentication** - Secure token-based sessions
- 🛡️ **Password Hashing** - bcrypt with configurable rounds
- ✅ **Input Validation** - Zod schemas for all user inputs
- 🏛️ **Financial Constraints** - Database-level protection against negative balances
- 📊 **Atomic Transactions** - All money movements are ACID-compliant

### User Experience
- ✨ **Premium UI Design** - Modern, fintech-grade interface
- 🎨 **Dark & Light Mode** - Beautiful in any theme
- 📲 **Expo Router v5** - File-based navigation with deep linking
- ⚡ **Real-time Updates** - Live balance and rate updates
- 🌐 **Multi-language Ready** - i18n infrastructure in place

## 📱 Tech Stack

### Frontend
- **React Native 0.79.5** with Expo SDK 53
- **Expo Router v5** - File-based routing
- **Zustand** - State management with persistence
- **TypeScript** - Full type safety
- **React Native Testing Library** - Testing framework

### Backend
- **Node.js 20.x** with Express.js 5
- **Prisma ORM** - Database management
- **PostgreSQL** - Primary database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Zod** - Schema validation

### DevOps & Tools
- **Monorepo** - npm workspaces
- **ESLint + Prettier** - Code quality
- **Jest** - Testing framework
- **TypeScript** - Strict typing throughout

## 📦 Project Structure

```
remittance-app/
├── frontend/                 # React Native Mobile App
│   ├── app/                 # Expo Router routes
│   │   ├── (auth)/          # Authentication screens
│   │   └── (dashboard)/     # Main app screens
│   ├── components/          # UI components
│   ├── lib/                 # Core utilities
│   └── __tests__/           # Test suites
│
├── backend/                 # Node.js API Server
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   └── __tests__/       # Unit & integration tests
│   └── prisma/              # Database schema & migrations
│
└── shared/                  # Shared types & utilities
```

## 🛠️ Installation

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher
- PostgreSQL 15.x or higher
- Expo CLI (for mobile development)

### 1. Clone & Install

```bash
git clone <repository-url>
cd remittance-app
npm install
```

### 2. Environment Setup

Create `.env` files in both frontend and backend directories:

**Backend (.env)**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/remitpay"
JWT_SECRET="your-super-secure-jwt-secret-min-32-chars"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:8081"
WISE_API_KEY="your-wise-api-key"
```

**Frontend (.env)**
```env
EXPO_PUBLIC_API_URL="http://localhost:3000"
EXPO_PUBLIC_APP_NAME="RemitPay"
EXPO_PUBLIC_APP_VERSION="1.0.0"
```

### 3. Database Setup

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start Development

```bash
# Start both frontend and backend
npm run dev

# Or run separately:
cd backend && npm run dev    # API on http://localhost:3000
cd frontend && npm run dev   # Expo on http://localhost:8081
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts
```

## 📋 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create new account |
| POST | `/api/v1/auth/login` | Authenticate user |

### Transfers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/transfer/quote` | Get transfer quote |
| POST | `/api/v1/transfer/create` | Execute transfer |
| GET | `/api/v1/transfer/history` | Transaction history |
| GET | `/api/v1/transfer/:id` | Transfer details |
| GET | `/api/v1/transfer/:id/receipt` | Download receipt |

### Wise Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/wise/accounts` | List accounts |
| POST | `/api/v1/wise/accounts` | Create account |
| GET | `/api/v1/wise/balances` | Get balances |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/search` | Search users |
| GET | `/api/v1/users/profile` | Get profile |
| PUT | `/api/v1/users/profile` | Update profile |

## 🔐 Security Features

- ✅ Atomic database transactions for all money movements
- ✅ Database constraints preventing negative balances
- ✅ Input sanitization and validation with Zod
- ✅ JWT tokens with secure storage
- ✅ Password hashing with bcrypt (salt rounds: 12)
- ✅ CORS configuration for API security
- ✅ Helmet.js for security headers
- ✅ Rate limiting on sensitive endpoints

## 🎨 UI/UX Highlights

- Premium fintech design with perfect visual hierarchy
- 8px grid system for consistent spacing
- Smooth 60fps animations and micro-interactions
- Professional color palette with proper contrast
- Accessible design (WCAG 2.1 AA compliant)
- One-handed usability for mobile devices

## 🚀 Production Deployment

### Prerequisites
- Production PostgreSQL database
- Environment variables configured
- SSL certificates for API
- CI/CD pipeline configured

### Deployment Steps

```bash
# 1. Build applications
npm run build

# 2. Run production migrations
cd backend
npm run db:deploy

# 3. Start production server
npm start
```

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend & backend |
| `npm run build` | Build all packages |
| `npm test` | Run all tests |
| `npm run lint` | Lint all code |
| `npm run typecheck` | TypeScript type checking |
| `npm run format` | Format code with Prettier |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality Requirements
- All tests must pass (52/52)
- ESLint must have zero errors
- TypeScript must compile without errors
- Code coverage should not decrease

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@remitpay.com or open an issue on GitHub.

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) for the amazing React Native framework
- [Wise](https://wise.com/) for banking infrastructure
- [Prisma](https://prisma.io/) for excellent database tooling

---

<p align="center">
  <strong>RemitPay</strong> - Secure, fast, and beautiful international money transfers.
</p>
