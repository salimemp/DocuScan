# DocScan Pro

A comprehensive document management application built with Expo (React Native) and FastAPI backend.

## Features

### Core Features
- **Document Scanning**: Capture documents using device camera with multi-page support
- **AI-Powered OCR**: Automatic text extraction using Google Gemini AI
- **Smart Organization**: Automatic document classification and tagging
- **Multi-language Support**: 13 languages including English, Korean, Tamil, Bengali, Hebrew
- **Cloud Backup**: Integration support for Google Drive, Dropbox, OneDrive, Box, iCloud

### Document Management
- **Password Protection**: Secure documents with PIN/password
- **E-Signatures**: Create, save, and add signatures to documents
- **Comments & Annotations**: Add comments and resolve threads
- **Export Formats**: 18+ export formats including:
  - Documents: PDF, DOCX, XLSX, PPTX, TXT, HTML, JSON, Markdown
  - Images: PNG, JPEG, TIFF, BMP, WebP, SVG
  - E-books: EPUB, MOBI

### Editor Features
- Rich text formatting (bold, italic, headers, lists)
- Page management (add, delete, merge, split pages)
- Watermarks and redaction
- AI assistant for document queries

## Tech Stack

### Frontend
- **Framework**: Expo (React Native)
- **Router**: Expo Router (file-based routing)
- **State Management**: React Hooks + Zustand
- **Internationalization**: i18next + react-i18next
- **Storage**: AsyncStorage for language persistence

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Google Gemini for OCR and AI assistant
- **Email**: Resend for signature requests

## Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI backend
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Backend environment variables
│
└── frontend/
    ├── app/              # Expo Router screens
    │   ├── (tabs)/       # Tab navigation screens
    │   │   ├── dashboard.tsx
    │   │   └── history.tsx
    │   ├── document/     # Document detail screens
    │   ├── scan.tsx      # Camera scanner
    │   ├── preview.tsx   # Scan preview
    │   └── editor.tsx    # Document editor
    ├── components/       # Reusable components
    ├── hooks/            # Custom hooks
    ├── i18n/             # Internationalization
    │   ├── i18n.ts       # i18next configuration
    │   └── translations.ts # All language strings
    └── utils/            # Utility functions
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB
- Expo CLI

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd /app/backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables in `.env`:
   ```
   MONGO_URL=mongodb://localhost:27017
   GEMINI_API_KEY=your_gemini_api_key
   RESEND_API_KEY=your_resend_api_key
   ```

5. Start the backend:
   ```bash
   uvicorn server:app --reload --port 8001
   ```

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd /app/frontend
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

## API Endpoints

### Documents
- `GET /api/documents` - List all documents
- `POST /api/documents` - Create document
- `GET /api/documents/{id}` - Get document details
- `PUT /api/documents/{id}` - Update document
- `DELETE /api/documents/{id}` - Delete document
- `POST /api/documents/{id}/export` - Export document

### Scanning
- `POST /api/scan` - Analyze scanned images with AI

### Signatures
- `GET /api/signatures` - List saved signatures
- `POST /api/signatures` - Save new signature
- `DELETE /api/signatures/{id}` - Delete signature

### Password Protection
- `POST /api/documents/{id}/password` - Set/remove password
- `POST /api/documents/{id}/verify-password` - Verify password

## Supported Languages

| Language | Code | RTL |
|----------|------|-----|
| English | en | No |
| Spanish | es | No |
| French | fr | No |
| German | de | No |
| Arabic | ar | Yes |
| Chinese | zh | No |
| Japanese | ja | No |
| Portuguese | pt | No |
| Hindi | hi | No |
| Korean | ko | No |
| Tamil | ta | No |
| Bengali | bn | No |
| Hebrew | he | Yes |

## Environment Variables

### Backend (.env)
| Variable | Description |
|----------|-------------|
| MONGO_URL | MongoDB connection string |
| GEMINI_API_KEY | Google Gemini API key for OCR |
| RESEND_API_KEY | Resend API key for emails |

### Frontend (.env)
| Variable | Description |
|----------|-------------|
| EXPO_PUBLIC_BACKEND_URL | Backend API URL |

## License

Proprietary - All rights reserved.

## Support

For support, please contact the development team.
