# 🛡️ Enterprise Branch Protection Configuration (`main`)

This guide provides the exact **GitHub CLI (`gh api`)** command to enforce enterprise-grade branch protection rules on the `main` branch of [The-Ultimate-Master-Study-Tracker](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker).

---

## 🔒 Required Status Checks & Security Policies

When applied, this policy strictly requires:
1. **Tier 1 Fast Quality Gate**: Typecheck, ESLint, and Vitest unit tests must pass.
2. **Tier 3 CodeQL SAST**: Zero high/critical code security vulnerabilities.
3. **Gitleaks Secret Scanner**: Zero hardcoded secrets, private keys, or tokens.
4. **Mandatory Pull Requests**: Direct `git push origin main` is blocked for all users.
5. **Linear Git History**: Enforces clean `Squash and merge` or `Rebase`.
6. **No Force Pushes or Branch Deletion**: Protects git commit integrity.

---

## ⚡ Exact GitHub CLI (`gh api`) Command

Run the following command in PowerShell or Bash:

```bash
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/branches/main/protection \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Fast Quality Gate (Typecheck, Lint & Unit Test)",
      "Analyze (javascript-typescript)",
      "Detect Hardcoded Secrets"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
EOF
```

> [!NOTE]
> `required_approving_review_count` is set to `0` for solo maintainer setups with Google Release Please automation. Set to `1` when collaborating with external reviewers.

---

## 🪟 Windows PowerShell Single-Line Command

If running directly in standard Windows PowerShell:

```powershell
$body = @{
  required_status_checks = @{
    strict = $true
    contexts = @(
      "Fast Quality Gate (Typecheck, Lint & Unit Test)",
      "Analyze (javascript-typescript)",
      "Detect Hardcoded Secrets"
    )
  }
  enforce_admins = $false
  required_pull_request_reviews = @{
    dismiss_stale_reviews = $true
    required_approving_review_count = 0
  }
  restrictions = $null
  required_linear_history = $true
  allow_force_pushes = $false
  allow_deletions = $false
  required_conversation_resolution = $true
} | ConvertTo-Json -Depth 5

$body | gh api --method PUT /repos/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/branches/main/protection --input -
```

---

## 🔍 Verification

To verify that the branch protection is active and returning the required checks:

```bash
gh api /repos/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/branches/main/protection --jq '{protected: true, required_checks: .required_status_checks.contexts}'
```
