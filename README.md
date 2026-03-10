# DocScan Pro

A comprehensive, enterprise-grade document management application built with Expo (React Native) and FastAPI backend. Features AI-powered scanning, multi-language support, authentication, and subscription management.

## 🚀 Features

### Core Features
- **Document Scanning**: Capture documents using device camera with multi-page support
- **Batch Scanning Mode**: Auto-capture multiple pages at configurable intervals (2s, 3s, 5s, 10s)
- **AI-Powered OCR**: Automatic text extraction using Google Gemini AI
- **Math Solver**: AI-powered math problem solving from images or text input
- **Read Aloud**: Text-to-speech accessibility feature with speed controls
- **Smart Organization**: Automatic document classification and tagging
- **Multi-language Support**: 13 languages with RTL support

### 🎤 Voice Commands
Full voice control support with 50+ commands:
- **Scanning**: "scan", "capture", "snap", "batch", "flash", "flip"
- **Navigation**: "continue", "done", "cancel", "back", "gallery"
- **Reading**: "read", "faster", "slower", "stop reading"
- **Export**: "export PDF", "share", "export Word"
- **Security**: "encrypt", "lock", "decrypt", "unlock"
- **Math**: "solve", "calculate", "equation"
- **Help**: "help", "commands", "what can you do"

### 📳 Haptic Feedback
Tactile feedback for all interactions:
- Light, medium, heavy impact feedback
- Success, warning, error notifications
- Custom camera shutter pattern
- Batch completion celebration pattern

### 📱 Widget Support
Home screen widgets for quick access:
- **Small Widget**: Quick Scan button with stats
- **Medium Widget**: Recent documents list
- **Large Widget**: Full dashboard with stats and documents

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

### 🔒 Document Security
- **AES-256-GCM Encryption**: Military-grade encryption at rest
- **Secure Enclave**: Protected storage for sensitive documents
- **Security Levels**: Normal, Sensitive, Critical classification
- **AI Categorization**: Auto-detect document types (passport, contract, medical, etc.)
- **Advanced Search**: Filter by category, date, encryption status, tags

### 💳 Subscription Plans

| Plan | Monthly | Annual (20% off) | Trial | Features |
|------|---------|------------------|-------|----------|
| **Free** | $0 | $0 | - | 5 scans/day, basic export, 100MB storage |
| **Plus** | $4.99 | $47.92/yr | 7 days | Unlimited scans, 5GB storage, PDF/DOCX export |
| **Pro** | $9.99 | $95.92/yr | 7 days | All formats, Math Solver, Read Aloud, 50GB, E-signatures |
| **Business** | $19.99/user | $191.92/user/yr | 14 days | Team features, 200GB/user, API access, Admin console |

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
- **Haptics**: expo-haptics
- **Speech**: expo-speech
- **Storage**: AsyncStorage for persistence

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Google Gemini (OCR, Math Solver, Categorization)
- **Email**: Resend (transactional emails)
- **Payments**: Stripe (subscriptions)
- **Auth**: JWT + WebAuthn + TOTP
- **Encryption**: cryptography (AES-256-GCM)

## Project Structure

```
/app
├── backend/
│   ├── server.py              # Main FastAPI application
│   ├── auth.py                # Authentication module
│   ├── subscriptions.py       # Stripe subscription handling
│   ├── document_security.py   # Encryption & secure enclave
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
│
├── frontend/
│   ├── app/                   # Expo Router screens
│   │   ├── (tabs)/            # Tab navigation
│   │   │   ├── dashboard.tsx  # Main dashboard
│   │   │   └── history.tsx    # Document history
│   │   ├── document/[id].tsx  # Document detail
│   │   ├── auth.tsx           # Authentication screen
│   │   ├── subscription.tsx   # Paywall/subscription
│   │   ├── profile.tsx        # User profile & security
│   │   ├── notifications.tsx  # Notification settings
│   │   ├── secure-enclave.tsx # Encrypted documents
│   │   ├── compliance.tsx     # Compliance info
│   │   ├── onboarding.tsx     # User onboarding
│   │   ├── scan.tsx           # Camera scanner + batch mode
│   │   ├── preview.tsx        # Scan preview
│   │   └── editor.tsx         # Document editor
│   │
│   ├── components/
│   │   ├── MathSolverModal.tsx    # AI Math solver
│   │   ├── ReadAloudControls.tsx  # Text-to-speech
│   │   ├── SignatureCanvas.tsx    # E-signatures
│   │   └── CookieConsentBanner.tsx
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx    # Global auth state
│   │
│   ├── services/
│   │   ├── VoiceCommandsService.ts  # Voice commands
│   │   └── OfflineSyncService.ts    # Offline mode
│   │
│   ├── utils/
│   │   ├── appStore.ts        # Zustand global state
│   │   ├── haptics.ts         # Haptic feedback
│   │   ├── widgetData.ts      # Home screen widgets
│   │   ├── imageCompression.ts # Image optimization
│   │   └── analytics.ts       # Usage analytics
│   │
│   └── i18n/
│       └── locales/           # 13 language files
│           ├── en.ts, es.ts, fr.ts, de.ts
│           ├── it.ts, pt.ts, zh.ts, ja.ts
│           ├── ko.ts, ar.ts, hi.ts, ta.ts, bn.ts
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/magic-link` | Request magic link |
| POST | `/api/auth/2fa/setup` | Setup 2FA |
| POST | `/api/auth/2fa/verify` | Verify 2FA code |
| POST | `/api/auth/passkey/register/start` | Start passkey registration |
| POST | `/api/auth/passkey/auth/start` | Start passkey authentication |

### Security
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/security/encrypt-document` | Encrypt document (AES-256) |
| POST | `/api/security/decrypt-document` | Decrypt document |
| POST | `/api/security/categorize` | AI categorization |
| POST | `/api/security/move-to-enclave/{id}` | Move to secure enclave |
| GET | `/api/security/enclave-stats` | Enclave statistics |
| GET | `/api/security/advanced-search` | Advanced document search |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/{id}` | Get document |
| PUT | `/api/documents/{id}` | Update document |
| DELETE | `/api/documents/{id}` | Delete document |
| POST | `/api/documents/{id}/export` | Export document |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/tiers` | Get subscription tiers |
| POST | `/api/subscriptions/checkout` | Create checkout session |
| GET | `/api/subscriptions/current` | Get current subscription |

## Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=docscanpro
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-key
RESEND_API_KEY=your-resend-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Frontend (.env)
```env
EXPO_PUBLIC_BACKEND_URL=https://your-backend.com
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB
- Expo CLI

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-repo/docscan-pro.git
cd docscan-pro
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
python server.py
```

3. **Frontend Setup**
```bash
cd frontend
yarn install
cp .env.example .env
# Edit .env with your backend URL
yarn start
```

4. **Run on device**
- Scan QR code with Expo Go app
- Or run `yarn ios` / `yarn android` for native builds

## Voice Commands Reference

### Scanning Mode
| Command | Action |
|---------|--------|
| "scan", "capture", "snap" | Take a photo |
| "batch", "batch mode" | Start batch scanning |
| "stop batch" | Stop batch scanning |
| "flash" | Toggle flashlight |
| "flip", "switch camera" | Switch front/rear camera |
| "gallery", "import" | Import from photo library |

### Navigation
| Command | Action |
|---------|--------|
| "continue", "done" | Proceed to next step |
| "cancel", "back" | Go back |
| "help" | Hear available commands |

### Document Actions
| Command | Action |
|---------|--------|
| "read", "read aloud" | Read document text |
| "faster" / "slower" | Adjust reading speed |
| "stop reading" | Stop text-to-speech |
| "export PDF" | Export as PDF |
| "share" | Share document |
| "encrypt", "lock" | Encrypt document |
| "solve", "calculate" | Open math solver |

## License

MIT License - see LICENSE file for details.

## Support

- Email: support@docscanpro.com
- Documentation: https://docs.docscanpro.com
- Issue Tracker: https://github.com/your-repo/issues
