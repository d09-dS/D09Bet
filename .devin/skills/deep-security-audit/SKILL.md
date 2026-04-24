# Deep Security Audit

Perform a comprehensive OWASP-aligned security audit of the codebase.

## Instructions

1. Read the workflow definition at `.windsurf/workflows/deep-security-audit.md` and execute ALL steps described there.
2. Read the security rule at `.windsurf/rules/security.md` for reference standards.

## Steps Overview

1. **Dependency Audit** -- Run `npm audit`, `pip-audit`, or equivalent for the detected package manager
2. **Secret Detection** -- Scan for API keys, AWS keys, private keys, passwords in source code
3. **Authentication & Authorization Review** -- Check password hashing, JWT handling, RBAC
4. **Input Validation** -- Check for SQL injection, XSS, command injection, path traversal
5. **API Security** -- Verify HTTPS, CORS, rate limiting, error message exposure
6. **OWASP A01/A08/A10** -- Check for IDOR, insecure deserialization, SSRF
7. **Data Protection** -- Review encryption, PII handling, log sanitization
8. **Security Headers** -- Verify HSTS, CSP, X-Frame-Options, etc.
9. **Generate Report** -- Create findings report sorted by severity
10. **Remediation Guidance** -- Provide fix examples for each finding
11. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/deep-security-audit/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- `.windsurf/docs/SECURITY_AUDIT.md` -- Comprehensive audit report
- Dashboard entry with severity breakdown (Critical, High, Medium, Low)
- Compliance checklist (OWASP Top 10, GDPR, PCI DSS)

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "deep-security-audit",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
