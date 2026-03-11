# DocScan Pro - CI/CD Pipeline

This document describes the GitHub Actions CI/CD pipeline for DocScan Pro.

## 📁 Workflow Files

| File | Purpose | Trigger |
|------|---------|---------|
| `ci.yml` | Continuous Integration | Push/PR to main, develop |
| `cd.yml` | Continuous Deployment | Push to main, develop |
| `pr-check.yml` | Pull Request Validation | PR opened/updated |
| `release.yml` | Release & App Store Builds | Tag push (v*.*.*) |
| `codeql.yml` | Security Analysis | Weekly + Push to main |

---

## 🔄 CI Pipeline (`ci.yml`)

Runs on every push and pull request to validate code quality.

### Jobs

```
┌─────────────────┐     ┌─────────────────┐
│ frontend-lint   │     │  backend-lint   │
│ (ESLint, TSC)   │     │  (Ruff)         │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ frontend-test   │     │  backend-test   │
│ (Jest)          │     │  (Pytest)       │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ frontend-build  │     │backend-security │
│ (Expo Web)      │     │ (Bandit)        │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
              ┌─────────────┐
              │ ci-summary  │
              └─────────────┘
```

---

## 🚀 CD Pipeline (`cd.yml`)

Deploys to staging (develop branch) or production (main branch).

### Environments

| Branch | Environment | URL |
|--------|-------------|-----|
| `develop` | Staging | https://staging.docscanpro.app |
| `main` | Production | https://docscanpro.app |

### Deployment Flow

1. **Build Docker Image** → Push to GitHub Container Registry
2. **Deploy Backend** → Update server with new image
3. **Expo Publish** → OTA update for mobile apps

---

## ✅ PR Check (`pr-check.yml`)

Quick validation for pull requests:

- ✓ Check for merge conflicts
- ✓ TypeScript compilation
- ✓ Python syntax check
- ✓ Quick linting

---

## 📦 Release Pipeline (`release.yml`)

Triggered by version tags (e.g., `v2.1.0`):

1. Create GitHub Release with changelog
2. Build iOS app (macOS runner)
3. Build Android app (Ubuntu runner)
4. Upload to EAS Build

### Creating a Release

```bash
# Tag and push
git tag v2.1.0
git push origin v2.1.0
```

Or use the manual workflow dispatch in GitHub Actions.

---

## 🔐 Required Secrets

Configure these in **Settings → Secrets and variables → Actions**:

### Required

| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Expo access token for EAS builds |
| `GEMINI_API_KEY` | Google Gemini API key for tests |

### Optional

| Secret | Description |
|--------|-------------|
| `BACKEND_URL` | Custom backend URL |
| `RESEND_API_KEY` | Resend API key for email tests |
| `DEPLOY_SSH_KEY` | SSH key for server deployment |

### Getting Expo Token

```bash
# Login to Expo
npx expo login

# Generate token
npx expo token:create
```

---

## 🔄 Dependabot

Automated dependency updates configured in `.github/dependabot.yml`:

- **Frontend**: Weekly updates for npm packages
- **Backend**: Weekly updates for pip packages  
- **CI**: Weekly updates for GitHub Actions

---

## 🐳 Docker

### Backend Dockerfile

Multi-stage build for optimized production image:

```dockerfile
# Build: Install dependencies
FROM python:3.11-slim as builder

# Production: Minimal runtime
FROM python:3.11-slim
```

### Build Locally

```bash
cd backend
docker build -t docscan-backend .
docker run -p 8001:8001 docscan-backend
```

---

## 📊 Artifacts

Artifacts are stored for 7 days:

| Artifact | Contents |
|----------|----------|
| `frontend-web-build` | Expo web export |
| `backend-coverage` | Pytest coverage report |
| `security-reports` | Bandit security scan |

---

## 🛡️ Security

### CodeQL Analysis

- Runs weekly on Monday at 6 AM
- Scans JavaScript/TypeScript and Python
- Results in Security tab

### Bandit Scan

- Checks Python code for vulnerabilities
- Runs on every CI pipeline

### Safety Check

- Scans pip dependencies for known vulnerabilities

---

## 📝 Branch Protection Rules

Recommended settings for `main` branch:

- [x] Require pull request reviews
- [x] Require status checks to pass
  - `frontend-build`
  - `backend-test`
- [x] Require branches to be up to date
- [x] Require conversation resolution
- [x] Include administrators

---

## 🎯 Pipeline Status Badges

Add to your README.md:

```markdown
![CI](https://github.com/YOUR_ORG/docscan-pro/actions/workflows/ci.yml/badge.svg)
![CD](https://github.com/YOUR_ORG/docscan-pro/actions/workflows/cd.yml/badge.svg)
```

---

## 🔧 Troubleshooting

### Common Issues

**1. Expo build fails**
```
Error: EXPO_TOKEN is not set
```
→ Add `EXPO_TOKEN` to repository secrets

**2. MongoDB connection fails in tests**
```
Connection refused
```
→ Ensure MongoDB service is running in workflow

**3. Docker build fails**
```
pip install failed
```
→ Check `requirements.txt` for version conflicts

### Debug Mode

Add to workflow step for verbose output:
```yaml
- name: Debug step
  run: |
    echo "Debug info..."
  env:
    ACTIONS_STEP_DEBUG: true
```

---

## 📞 Support

For CI/CD issues:
1. Check Actions tab for logs
2. Review artifacts for detailed reports
3. Open an issue with workflow run link
