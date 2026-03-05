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
- **Root layout** (`app/_layout.tsx`): GestureHandlerRootView + SafeAreaProvider + Stack
- **Index redirect** (`app/index.tsx`): Redirects `/` → `/dashboard`
- **Tab layout** (`app/(tabs)/_layout.tsx`): Dashboard + History tabs with Ionicons
- **Dashboard screen** (`app/(tabs)/dashboard.tsx`):
  - Header: greeting (time-of-day), "DocScan Pro" title, date, settings button
  - Stats row: Total Scans (24), Storage Used (48.3 MB), Last Scan (2h ago)
  - Scan CTA: Large blue prominent button
  - Quick Actions: Import Photo, Share Doc, New Folder, Cloud Backup (2×2 grid)
  - Recent Scans: Horizontal scroll with 5 document cards
- **History screen** (`app/(tabs)/history.tsx`):
  - Search bar with live filtering
  - Filter chips: All, PDF, JPG, PNG, DOCX, XLSX
  - Sort modal: Latest, Oldest, A–Z, Z–A, Size
  - List/Grid toggle (2-column grid)
  - Empty state when no results
- **DocumentCard component** (`components/DocumentCard.tsx`): Grid + List variants
- **Theme hook** (`hooks/useTheme.ts`): Light/dark color palettes + shadows
- **Mock data** (`data/mockDocuments.ts`): 12 sample documents (PDF, JPG, PNG, DOCX, XLSX)

## Prioritized Backlog

### P0 (Core Functionality — Next)
- Camera integration for actual document scanning
- Image processing / edge detection UI
- Save scanned documents to local storage / MongoDB

### P1 (Important Features)
- Document detail screen (full-screen preview, rename, share, delete)
- PDF export generation
- Folder/category management
- Cloud sync

### P2 (Nice to Have)
- OCR text extraction
- Multi-page scan stitching
- Dark mode polish + micro-animations
- Push notifications for backup reminders

## Next Tasks List
1. Implement camera scanning screen (`app/scan.tsx`) with live viewfinder
2. Add document detail/preview screen
3. Connect to backend for persistence (MongoDB)
4. Add document sharing + PDF export
