# Security Policy

## Supported Versions

We take the security of FlowTrack Pro seriously. The following versions are currently receiving active security updates:

| Version | Supported | Status |
|---|---|---|
| `main` (Latest) | :white_check_mark: | Active support |
| `0.5.x` | :white_check_mark: | Active production release |
| `0.4.x` | :white_check_mark: | Maintenance security updates |
| `< 0.4.0` | :x: | End of life |

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

- **Electron Hardening**: `webSecurity: true`, `contextIsolation: true`, `nodeIntegration: false`. No insecure Node.js bindings exposed in renderer processes. Preload bridge explicitly whitelists permitted invoke channels.
- **Strict DOM Sanitization**: All embedded media, webviews, and iframes are guarded by the `sanitizeSafeUrl()` validation barrier (rejecting `javascript:`, `vbscript:`, and unsafe data protocols).
- **Discord RPC Local Boundary**: Connects strictly to local OS named pipes (`\\.\pipe\discord-ipc-0`..`9` on Windows). Zero external telemetry connections or third-party relay servers.
- **Loopback Receiver Isolation**: The WakaTime heartbeat receiver binds strictly to `127.0.0.1:7777` with CORS origin verification and Host header validation to prevent DNS-rebinding attacks.
- **Encrypted Local Vault**: All local backup exports utilize AES-256-GCM authenticated encryption derived via PBKDF2 with 100,000 SHA-256 iterations and random salt.
- **Automated DevSecOps**:
  - **CodeQL**: Deep AST semantic security analysis across all JavaScript and TypeScript surfaces.
  - **Gitleaks**: Pre-commit and CI secret scanning blocking hardcoded credentials.
  - **Dependabot**: Automated weekly vulnerable dependency patching.
  - **OpenSSF Scorecard**: Supply chain security attestation and release provenance verification.
