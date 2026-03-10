# DocScan Pro

A comprehensive, enterprise-grade document management application built with Expo (React Native) and FastAPI backend. Features AI-powered scanning, multi-language support, authentication, and subscription management.

## 🚀 Features

### Core Features
- **Document Scanning**: Capture documents using device camera with multi-page support
- **AI-Powered OCR**: Automatic text extraction using Google Gemini AI
- **Math Solver**: AI-powered math problem solving from images or text input
- **Read Aloud**: Text-to-speech accessibility feature with speed controls
- **Smart Organization**: Automatic document classification and tagging
- **Multi-language Support**: 13 languages with RTL support

### Document Management
- **Password Protection**: Secure documents with PIN/password
- **E-Signatures**: Create, save, and add signatures to documents
- **Comments & Annotations**: Add comments and resolve threads
- **Export Formats**: 18+ export formats including:
  - Documents: PDF, DOCX, XLSX, PPTX, TXT, HTML, JSON, Markdown
  - Images: PNG, JPEG, TIFF, BMP, WebP, SVG
  - E-books: EPUB, MOBI

### 🔐 Authentication System
- **Email/Password**: Traditional authentication with email confirmation
- **Magic Link**: Passwordless email-based login
- **Social Login**: Google OAuth and Apple Sign-In
- **Biometrics**: Face ID / Fingerprint authentication
- **2FA (Two-Factor Authentication)**:
  - TOTP (Authenticator apps like Google Authenticator)
  - Email-based backup codes
  - Hardware security keys (WebAuthn/FIDO2)
- **Passkeys**: WebAuthn-based passwordless authentication
- **JWT Tokens**: Secure access and refresh token management

### 💳 Subscription Plans

| Plan | Monthly | Annual (20% off) | Features |
|------|---------|------------------|----------|
| **Free** | $0 | $0 | 5 scans/day, basic export, 100MB storage |
| **Plus** | $4.99 | $47.92/yr | Unlimited scans, 5GB storage, PDF/DOCX export |
| **Pro** | $9.99 | $95.92/yr | All formats, Math Solver, Read Aloud, 50GB, E-signatures |
| **Business** | $19.99/user | $191.92/user/yr | Team features, 200GB/user, API access, Admin console |

### 🛡️ Compliance & Security
- **GDPR** (European Union)
- **CCPA** (California Consumer Privacy Act)
- **HIPAA** (Health data protection)
- **PIPEDA** (Canada)
- **SOC 2** (International)

## Tech Stack

### Frontend
- **Framework**: Expo (React Native)
- **Router**: Expo Router (file-based routing)
- **State Management**: React Query + Zustand
- **Internationalization**: i18next (13 languages)
- **Authentication**: expo-local-authentication, expo-web-browser
- **Storage**: AsyncStorage for persistence

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Google Gemini (OCR, Math Solver)
- **Email**: Resend (transactional emails)
- **Payments**: Stripe (subscriptions)
- **Auth**: JWT + WebAuthn

## Project Structure

```
/app
├── backend/
│   ├── server.py          # Main FastAPI application
│   ├── auth.py            # Authentication module
│   ├── subscriptions.py   # Stripe subscription handling
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Environment variables
│
├── frontend/
│   ├── app/               # Expo Router screens
│   │   ├── (tabs)/        # Tab navigation
│   │   │   ├── dashboard.tsx
│   │   │   └── history.tsx
│   │   ├── document/[id].tsx  # Document detail
│   │   ├── auth.tsx       # Authentication screen
│   │   ├── subscription.tsx   # Paywall/subscription
│   │   ├── compliance.tsx # Compliance info
│   │   ├── onboarding.tsx # User onboarding
│   │   ├── scan.tsx       # Camera scanner
│   │   ├── preview.tsx    # Scan preview
│   │   └── editor.tsx     # Document editor
│   │
│   ├── components/
│   │   ├── MathSolverModal.tsx    # AI Math solver
│   │   ├── ReadAloudControls.tsx  # Text-to-speech
│   │   ├── SignatureCanvas.tsx    # E-signatures
│   │   └── CookieConsentBanner.tsx
│   │
│   ├── hooks/
│   │   ├── useLanguage.ts  # i18n hook
│   │   └── useTheme.ts     # Theme management
│   │
│   ├── i18n/
│   │   ├── i18n.ts         # i18next config
│   │   └── locales/        # Language files (13 languages)
│   │
│   └── utils/
│       ├── queryClient.tsx  # React Query setup
│       └── analytics.ts     # Analytics tracking
│
├── README.md
├── PRIVACY_POLICY.md
└── TERMS_OF_USE.md
```

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register with email/password |
| POST | `/login` | Login with credentials |
| POST | `/login/2fa` | Verify 2FA code |
| POST | `/magic-link/request` | Request magic link |
| GET | `/magic-link/verify` | Verify magic link |
| GET | `/confirm-email` | Confirm email address |
| POST | `/2fa/setup` | Setup 2FA (TOTP) |
| POST | `/2fa/verify-setup` | Verify 2FA setup |
| POST | `/2fa/disable` | Disable 2FA |
| GET | `/google` | Google OAuth redirect |
| POST | `/google/callback` | Google OAuth callback |
| GET | `/me` | Get current user |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Logout user |
| POST | `/password/reset-request` | Request password reset |
| POST | `/password/reset-confirm` | Confirm password reset |

### Subscriptions (`/api/subscriptions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tiers` | Get subscription tiers |
| POST | `/create` | Create subscription |
| GET | `/current` | Get current subscription |
| POST | `/cancel` | Cancel subscription |
| POST | `/reactivate` | Reactivate subscription |
| POST | `/upgrade` | Upgrade/change plan |
| GET | `/invoices` | Get invoice history |
| POST | `/portal` | Stripe customer portal |
| POST | `/webhook` | Stripe webhook handler |

### Documents (`/api`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents` | List all documents |
| POST | `/documents` | Create document |
| GET | `/documents/{id}` | Get document |
| PUT | `/documents/{id}` | Update document |
| DELETE | `/documents/{id}` | Delete document |
| POST | `/documents/{id}/export` | Export document |
| POST | `/scan` | Analyze with AI OCR |
| POST | `/math/solve` | Solve math problem |

## Supported Languages

| Language | Code | RTL | Status |
|----------|------|-----|--------|
| English | en | No | ✅ Full |
| Spanish | es | No | ✅ Full |
| French | fr | No | ✅ Full |
| German | de | No | ✅ Full |
| Portuguese | pt | No | ✅ Full |
| Chinese | zh | No | ✅ Full |
| Japanese | ja | No | ✅ Full |
| Korean | ko | No | ✅ Full |
| Hindi | hi | No | ✅ Full |
| Tamil | ta | No | ✅ Full |
| Bengali | bn | No | ✅ Full |
| Arabic | ar | Yes | ✅ Full |
| Hebrew | he | Yes | ✅ Full |

## Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
GEMINI_API_KEY=your_gemini_api_key
RESEND_API_KEY=your_resend_api_key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
JWT_SECRET=your_jwt_secret
```

### Frontend (.env)
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

## Setup Instructions

### Backend Setup
```bash
cd /app/backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend Setup
```bash
cd /app/frontend
yarn install
npx expo start
```

## Security Features
- End-to-end encryption for sensitive documents
- Secure JWT token management with refresh tokens
- WebAuthn/FIDO2 support for hardware security keys
- TOTP-based 2FA with backup codes
- Rate limiting on authentication endpoints
- Secure password hashing with salt

## License
Proprietary - All rights reserved.

## Support
For support, contact: support@docscanpro.com

---
**Powered by Elixio Digital**
