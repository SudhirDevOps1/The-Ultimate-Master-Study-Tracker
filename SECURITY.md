# Security Policy

## Supported Versions

We take the security of FlowTrack Pro seriously. The following versions are currently receiving active security updates:

| Version | Supported | Status |
|---|---|---|
| `main` (Latest) | :white_check_mark: | Active support |
| `0.2.x` | :white_check_mark: | Active support |
| `< 0.2.0` | :x: | End of life |

---

## Reporting a Vulnerability

> [!IMPORTANT]
> **Please do not report security vulnerabilities via public GitHub issues.**

If you discover a potential security vulnerability in FlowTrack Pro, please report it privately via GitHub:

- Navigate to the [Security Advisories tab](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/security/advisories) of this repository and click **"Report a vulnerability"**.
- This opens a confidential disclosure advisory accessible only to core repository maintainers.

### What to Include in Your Report
- A clear description of the issue and potential impact
- Detailed step-by-step reproduction instructions or a minimal Proof of Concept (PoC)
- Affected platforms (Windows, Linux, macOS, or Web)
- Proposed remediations or patches (if available)

### Response SLA
- **Initial Acknowledgement**: Within 24–48 hours
- **Triage & Reproduction**: Within 72 hours
- **Security Advisory & Patch Release**: Disclosed responsibly once a fix is deployed

---

## Security Architecture Principles

- **Electron Hardening**: `webSecurity: true`, `contextIsolation: true`, `nodeIntegration: false`. No insecure node bindings exposed in renderer processes.
- **Strict DOM Sanitization**: All embedded media, webviews, and iframes are guarded by the [`sanitizeSafeUrl()`](file:///d:/The-Ultimate-Master-Study-Tracker/desktop-app/src/utils/security.ts) validation barrier (rejecting `javascript:`, `vbscript:`, and unsafe data protocols).
- **Automated DevSecOps**:
  - **CodeQL**: Deep AST semantic security analysis.
  - **Gitleaks**: Pre-commit & CI secret detection.
  - **Dependabot**: Automated weekly vulnerable dependency patching.
  - **OpenSSF Scorecard**: Supply chain security compliance.
