# Contributing to FlowTrack Pro

Thank you for your interest in contributing to **FlowTrack Pro**! We welcome contributions from developers, designers, educators, and students around the world.

> [!IMPORTANT]
> FlowTrack Pro is an open-source, privacy-first offline study workstation. All contributions must respect user privacy, run performantly on low-resource machines, and strictly adhere to safe DOM sanitization standards.

---

## 🧭 Code of Conduct

This project is governed by our [Code of Conduct](file:///d:/The-Ultimate-Master-Study-Tracker/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to project maintainers via GitHub private report.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Git**: `v2.40+`
- **Package Manager**: `npm` (v10+) or `pnpm` (v9+)

### 1. Fork & Clone
```bash
git clone https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git
cd The-Ultimate-Master-Study-Tracker
```

### 2. Install Dependencies
```bash
cd desktop-app
npm install --legacy-peer-deps
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Launch Desktop App (Electron)
In a separate terminal:
```bash
cd desktop-app
npm run electron
```

---

## 🧪 Quality Verification Checklist

Before submitting a Pull Request, ensure that all automated checks pass locally:

```bash
# 1. Typecheck with TypeScript
npm run typecheck

# 2. Lint code style
npm run lint

# 3. Execute unit tests
npm run test

# 4. Verify production bundle build
npm run build
```

> [!TIP]
> Running `npm run typecheck` catches missing interface props and typing errors early, preventing GitHub Actions CI gate failures.

---

## 🔒 Security & Code Standards

- **DOM XSS Sanitization**: Never assign unsanitized user input or URLs directly to DOM sinks (`iframe.src`, `webview.src`, `video.src`, `audio.src`, `a.href`). Always use [`sanitizeSafeUrl()`](file:///d:/The-Ultimate-Master-Study-Tracker/desktop-app/src/utils/security.ts) from `@/utils/security`.
- **Electron Security**: Never disable `webSecurity` (`webSecurity: true` is strictly enforced). Maintain `contextIsolation: true` and `nodeIntegration: false`.
- **Zero Secret Leaks**: Automated scans by **Gitleaks** and **CodeQL** run on every PR. Never commit API keys, tokens, or credentials.
- **Privacy First**: User study logs, schedules, and analytics remain strictly in the local IndexedDB database and must never be telemetried or sent over the network.

---

## 📝 Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

| Prefix | Description | Example |
|---|---|---|
| `feat:` | A new feature | `feat(timer): add ambient binaural beats procedural synthesizer` |
| `fix:` | A bug or security fix | `fix(security): sanitize external web portal URLs to prevent DOM XSS` |
| `perf:` | A performance optimization | `perf(webviews): mount only active webview to reduce RAM by 120MB` |
| `docs:` | Documentation changes | `docs(readme): update quickstart and architecture diagrams` |
| `refactor:` | Code restructuring | `refactor(types): unify note and board types in shared module` |
| `test:` | Adding or improving tests | `test(store): add unit tests for pomodoro cycle state` |
| `ci:` | CI/CD pipeline changes | `ci(workflows): enforce 2-day schedule and concurrency gates` |

---

## 🌿 Enterprise Branching Architecture

FlowTrack Pro follows an enterprise-grade Git branching model designed for continuous stability and zero-regression releases:

```
[ main ] <────────────── (Production Releases & Auto-Changelog via Release Please)
   ▲  ▲
   │  └── [ hotfix/* ] ── (Emergency production security / crash fixes)
   │
[ develop ] <─────────── (Daily Integration & QA Gate)
   ▲
   ├── [ feature/* ] ── (New features, e.g. feature/timer-pip)
   └── [ fix/* ] ────── (Bug patches, e.g. fix/webview-leak)
```

| Branch | Role | Protection | Target for PRs |
| :--- | :--- | :--- | :--- |
| **`main`** | **Production**: Represents live production code. Triggers Google Release Please and multi-OS binary publishing. | 🔒 Protected | Staging PRs from `develop` or emergency `hotfix/*` |
| **`develop`** | **Integration / Staging**: Active daily development and testing before releasing to production. | 🔒 Protected | Default target for all `feature/*` and `fix/*` PRs |
| **`feature/*`** | **Features**: Created from `develop` for developing individual features. | Temporary | Merges into `develop` via PR |
| **`fix/*`** | **Bugfixes**: Created from `develop` for regular bug resolutions. | Temporary | Merges into `develop` via PR |
| **`hotfix/*`** | **Emergency Hotfixes**: Created directly from `main` to address critical production issues. | Temporary | Merges into `main` and then back-synced to `develop` |

---

## 🚀 Submitting a Pull Request

1. **Pull Latest Integration Branch**:
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Create a Topic Branch**:
   ```bash
   # For new features:
   git checkout -b feature/your-feature-name

   # For bug fixes:
   git checkout -b fix/your-bugfix-name
   ```

3. **Commit your changes** using conventional commit messages (`feat:`, `fix:`, `perf:`).

4. **Push to GitHub**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**:
   * Open the PR targeting base branch: **`develop`** (for standard development) or **`main`** (for critical hotfixes).
   * Fill out the Pull Request Template.
   * Automated **CodeRabbit AI** review and CI quality gates (Typecheck, Lint, Tests, CodeQL, Gitleaks) will run automatically.
