# DocScan Pro — Product Requirements Document

## Problem Statement
Build a React Native + Expo application utilizing Expo's latest SDK. Create a simple document scanner mobile app with two main sections: Dashboard and History. Build only the frontend design (no actual functionality yet).

## Architecture
- **Framework**: React Native + Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **Theming**: Auto dark/light via `useColorScheme`
- **State**: Local `useState` + `useMemo`

## User Personas
- Professionals who need to scan and organize documents on the go
- Students digitizing notes, assignments, and ID cards

## Core Requirements (Static)
- Two main screens: Dashboard + History
- Professional Blue accent (#2563EB)
- Auto dark/light theme
- Bottom tab navigation
- Filter/sort in History
- List/Grid toggle in History

## What's Been Implemented (Feb 2026 → Mar 2026)

### Mar 5, 2026 — Initial Build
- **Root layout** + **Index redirect** + **Tab layout** (Dashboard + History)
- **Dashboard screen**: greeting, real-time stats (API-driven), blue Scan CTA, Quick Actions, Recent Scans
- **History screen**: search, filter chips, sort modal, list/grid toggle, empty state
- **DocumentCard component**, **Theme hook** (auto dark/light), **Mock data** (12 docs)

### Mar 5, 2026 — Camera + Gemini AI OCR
- **Backend scan endpoint** (`POST /api/scan`): Gemini 2.0 Flash image analysis, multilingual OCR, structured JSON output for 18 document types
- **Backend document CRUD** (`/api/documents`, `/api/stats`): MongoDB persistence, soft delete
- **Scan screen** (`app/scan.tsx`): Full camera UI with scan frame, flash toggle, flip camera, gallery import
- **Preview screen** (`app/preview.tsx`): AI analysis display, confidence bar, formatted output renderer (line-by-line parser), structured fields, entity extraction (dates/amounts/names), tags, Save/Discard actions
- **Floating FAB** visible on all tabs (Dashboard + History)
- **Dashboard**: now loads live stats + recent docs from API, wired scan buttons
- **History**: loads real documents from MongoDB, pull-to-refresh, delete, thumbnail display
- **scanStore utility**: singleton for passing large base64 image between scan→preview without URL params
- **Packages**: expo-camera@17, expo-image-picker@17, expo-image-manipulator@14 (SDK 54 compatible)
- **app.json**: Camera + photo library permissions for iOS/Android

## Prioritized Backlog

### P0 (Requires user action — Gemini API Key)
- User must add their own `GEMINI_API_KEY=<key>` to `/app/backend/.env` to use real scanning
  - Currently uses `EMERGENT_LLM_KEY` as fallback (works with Emergent credits)

### P1 (Important Features — Next)
- Document detail screen (full-screen preview, rename, share, delete)
- Multi-page scan stitching (scan multiple pages → single document)
- PDF export from scanned documents
- Document sharing (native share sheet)

### P2 (Nice to Have)
- Folder/category management
- Cloud sync
- Offline mode with queue
- Push notifications for backup reminders

## Next Tasks List
1. User to add `GEMINI_API_KEY=<your-google-key>` to `/app/backend/.env` to enable real scanning
2. Build document detail/view screen
3. Add PDF export
4. Implement document sharing
