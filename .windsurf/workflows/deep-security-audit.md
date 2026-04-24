---
description: Perform a comprehensive security audit of the codebase
---

# Deep Security Audit Workflow

This workflow performs a thorough security analysis of the entire codebase.

## Step 1: Dependency Audit

Check for known vulnerabilities in dependencies:

```bash
# Node.js
npm audit
npx audit-ci --critical

# Python
pip-audit
safety check

# .NET
dotnet list package --vulnerable
```

Report findings with severity levels (Critical, High, Medium, Low).

## Step 2: Secret Detection

Scan for hardcoded secrets:

1. Search for patterns:
   - API keys: `[a-zA-Z0-9]{32,}`
   - AWS keys: `AKIA[0-9A-Z]{16}`
   - Private keys: `-----BEGIN.*PRIVATE KEY-----`
   - Passwords in code: `password\s*=\s*['"][^'"]+['"]`
   - Connection strings with credentials

2. Check files:
   - `.env` files (should be in `.gitignore`)
   - Configuration files
   - Test files
   - Comments

3. Verify `.gitignore` includes:
   - `.env`
   - `*.pem`
   - `*.key`
   - `credentials.json`

## Step 3: Authentication & Authorization Review

Check for:

### Authentication

- [ ] Password hashing uses bcrypt/Argon2 (not MD5/SHA1)
- [ ] JWT secrets are strong (256+ bits)
- [ ] Token expiration is reasonable
- [ ] Refresh token rotation is implemented
- [ ] Rate limiting on login endpoints
- [ ] Account lockout after failed attempts

### Authorization

- [ ] Every endpoint has authorization check
- [ ] Role-based access control is consistent
- [ ] No privilege escalation vulnerabilities
- [ ] Resource ownership is verified before access

## Step 4: Input Validation

Review all user inputs:

### SQL Injection

- [ ] All queries use parameterized statements
- [ ] No string concatenation in queries
- [ ] ORM is used correctly

### XSS (Cross-Site Scripting)

- [ ] User input is escaped before rendering
- [ ] Content-Security-Policy headers are set
- [ ] No `dangerouslySetInnerHTML` or `innerHTML` with user data

### Other Injections

- [ ] Command injection: No `exec()` with user input
- [ ] Path traversal: File paths are validated
- [ ] LDAP injection: Queries are escaped
- [ ] XML injection: Parser is configured securely

## Step 5: API Security

Check API endpoints:

- [ ] HTTPS enforced
- [ ] CORS configured properly (not `*` in production)
- [ ] Rate limiting implemented
- [ ] Request size limits set
- [ ] Sensitive data not in URLs
- [ ] Proper HTTP methods used
- [ ] Error messages don't leak information

## Step 5b: OWASP A01/A08/A10 — IDOR, Deserialization & SSRF

> Reference: cheatsheetseries.owasp.org (A01, A08, A10)

### IDOR (Insecure Direct Object Reference) — A01

- [ ] All resource endpoints verify ownership: `resource.userId === req.user.id`
- [ ] No sequential integer IDs exposed in public API responses (use UUIDs)
- [ ] Admin-only endpoints protected by role guard, not just authentication
- [ ] Bulk operations (batch delete, batch update) check ownership per item

```bash
# Manual test: can User A access User B's resource?
curl -H "Authorization: Bearer <user_a_token>" /api/v1/orders/<user_b_order_id>
# Expected: 403 Forbidden — NOT 200 OK
```

### Deserialization Vulnerabilities — A08

- [ ] No `JSON.parse()` on untrusted input without schema validation
- [ ] No `eval()`, `Function()`, or `vm.runInNewContext()` on user-supplied strings
- [ ] File uploads: validate MIME type server-side (not just extension); scan with antivirus if applicable
- [ ] No `pickle.loads()` / `yaml.load()` (use `yaml.safe_load()`) on untrusted Python data

### SSRF (Server-Side Request Forgery) — A10

- [ ] No user-controlled URLs are fetched server-side without validation
- [ ] Outbound HTTP calls use an allowlist of permitted domains
- [ ] Private IP ranges blocked: `10.x`, `172.16.x`, `192.168.x`, `127.x`, `169.254.x`
- [ ] Cloud metadata endpoints blocked: `169.254.169.254` (AWS/GCP), `fd00:ec2::254`

```bash
# Test SSRF: attempt to fetch internal metadata
curl -X POST /api/fetch-preview -d '{"url": "http://169.254.169.254/latest/meta-data/"}'
# Expected: 400 Bad Request or blocked — NOT a response with AWS metadata
```

## Step 6: Data Protection

Review data handling:

- [ ] Sensitive data encrypted at rest
- [ ] PII is properly handled
- [ ] Logs don't contain sensitive data
- [ ] Database backups are encrypted
- [ ] Data retention policies implemented

## Step 7: Security Headers

Verify HTTP security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=()
```

## Step 8: Generate Report

Create a security report with:

```markdown
# Security Audit Report

**Date:** [DATE]
**Project:** [PROJECT_NAME]
**Auditor:** AI Security Audit

## Executive Summary

[Brief overview of findings]

## Critical Issues

[List critical vulnerabilities that need immediate attention]

## High Priority Issues

[List high priority issues]

## Medium Priority Issues

[List medium priority issues]

## Low Priority Issues

[List low priority issues]

## Recommendations

[Prioritized list of recommended actions]

## Compliance Checklist

- [ ] OWASP Top 10 addressed
- [ ] GDPR requirements (if applicable)
- [ ] PCI DSS requirements (if applicable)
```

## Gotchas

- **`npm audit` reports transitive dependencies you cannot fix** -- use `npm audit --omit=dev` to focus on production dependencies. For unfixable transitive issues, document them and monitor for upstream patches.
- **Secret scanners miss environment-specific configs** -- `.env.staging`, `.env.production`, and Docker `env_file` entries are often excluded from scans. Explicitly include all `*.env*` patterns.
- **CORS `Access-Control-Allow-Origin: *` passes audit but is insecure** -- wildcard CORS is only safe for truly public APIs with no authentication. Any API using cookies or tokens must restrict origins.
- **Rate limiting on reverse proxy hides missing app-level limits** -- if the proxy (nginx, CloudFront) is removed or reconfigured, the app is unprotected. Always implement rate limiting at the application level as well.
- **Security headers set in development but not in production** -- `helmet()` middleware is often only in `app.ts` but not in the production Docker image or serverless function. Verify headers on the deployed URL, not just locally.

## Step 9: Remediation Guidance

For each issue found, provide:

1. Description of the vulnerability
2. Location in code
3. Risk level and potential impact
4. Recommended fix with code example
5. References to security best practices

## Step 10: Output Summary

```
Security Audit Complete

Project: [PROJECT_NAME]
Date: [DATE]

Findings:
- Critical:  [N] issues
- High:      [N] issues
- Medium:    [N] issues
- Low:       [N] issues

Checklist Results:
- Dependencies:          [PASS/FAIL]
- Secret Detection:      [PASS/FAIL]
- Authentication:        [PASS/FAIL]
- Input Validation:      [PASS/FAIL]
- API Security:          [PASS/FAIL]
- Data Protection:       [PASS/FAIL]
- Security Headers:      [PASS/FAIL]

Files created:
- .windsurf/docs/SECURITY_AUDIT.md

Compliance:
- OWASP Top 10: [N/10 addressed]
- GDPR relevant: [yes/no]

Next steps:
1. Fix all Critical issues before next deployment
2. Schedule High issues for next sprint
3. Re-run audit after fixes: /deep-security-audit
```

## Step 11: Save to Dashboard

Persist the audit results for the dashboard:

1. Read `.windsurf/dashboard-data.json` (create with `{"projects":[],"runs":[],"globalStats":{}}` if missing)
2. Build a timestamp string: current ISO time with colons replaced by hyphens (e.g. `2026-04-10T09-15-00`)
3. Build a date string from the timestamp: `YYYY-MM-DD` (e.g. `2026-04-10`)
4. Create directory `.windsurf/dashboard/runs/deep-security-audit/[date]/[timestamp]/`
5. Write `findings.json` + `report.md` into that directory
6. Append a new entry to `runs[]` in `dashboard-data.json`:

```json
{
  "workflow": "deep-security-audit",
  "timestamp": "[ISO timestamp]",
  "score": "[100 - 15*critical - 8*high - 3*medium - 1*low, min 0]",
  "maxScore": 100,
  "verdict": "[PASS / FAIL based on checklist results]",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "highlights": ["[security strengths found, e.g. proper hashing, good CORS]"],
  "issues": ["[top findings as short strings]"],
  "summary": "[1-2 sentence overview including OWASP coverage]",
  "reportPath": ".windsurf/dashboard/runs/deep-security-audit/[date]/[timestamp]/"
}
```

6. Write updated `dashboard-data.json` back to disk

## Step 12a: Next.js Security Checks (Stack: Next.js)

> Auto-added by /project-init -- Stack: Next.js -- Remove if stack changes

When auditing security for this Next.js project, additionally check:

1. **Environment variables**: Verify no secrets use the `NEXT_PUBLIC_` prefix (which exposes them to the client bundle)
2. **Server Actions**: Ensure all `'use server'` functions validate input with Zod before database operations
3. **API Routes**: Check that all `/api/` route handlers validate `Content-Type`, parse body with Zod, and return proper error responses
4. **CSRF**: Verify that state-changing operations use POST/PUT/DELETE (not GET) and that cookies use `SameSite=strict`
5. **Prisma raw queries**: Search for `$queryRawUnsafe` -- flag any usage with user input as a SQL injection risk
6. **Rate limiting**: Verify auth endpoints (`/api/auth/*`) have rate limiting configured (project uses @upstash/ratelimit)
7. **Dependency audit**: Run `npm audit` and flag any high/critical vulnerabilities

```bash
# Quick security scan commands
npm audit --audit-level=high
npx prisma validate
grep -r "queryRawUnsafe" src/ --include="*.ts"
grep -r "NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*KEY\|NEXT_PUBLIC_.*TOKEN" .env* --include=".env*"
```

If vulnerabilities are found: create a findings table with severity, file path, line number, and recommended fix.
