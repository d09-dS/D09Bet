---
description: Security best practices for web applications
trigger: glob
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---

# Security Best Practices

## Rule Priorities

| Priority | Category                           | Impact   |
| -------- | ---------------------------------- | -------- |
| 1        | Input Validation & SQL Injection   | CRITICAL |
| 2        | Authentication & Password Storage  | CRITICAL |
| 3        | IDOR & Broken Access Control (A01) | HIGH     |
| 4        | XSS Prevention                     | HIGH     |
| 5        | CSRF Protection                    | HIGH     |
| 6        | SSRF Prevention (A10)              | MEDIUM   |
| 7        | Secrets Management (A02)           | MEDIUM   |
| 8        | Security Headers & CORS            | MEDIUM   |
| 9        | Dependency Security                | LOW      |
| 10       | GDPR / Data Privacy                | LOW      |

Higher priority rules MUST be addressed first. Never ship code that violates CRITICAL rules.

## Input Validation

- Validate ALL user inputs on both client and server
- Use schema validation (Zod) for all API inputs, because Zod provides compile-time type inference and runtime validation in a single source of truth
- Sanitize inputs before rendering or storing
- Never trust client-side validation alone

## Authentication & Authorization

- Never store sensitive data in localStorage
- Use httpOnly, secure cookies for tokens
- Implement proper session management
- Always verify permissions server-side
- Use strong password hashing (bcrypt, Argon2)

## XSS Prevention

```typescript
// Bad - XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// Good - sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// Good - render as text (preferred)
<div>{userContent}</div>
```

## SQL Injection Prevention

Always use parameterized queries or an ORM like Prisma, because string interpolation in queries allows attackers to execute arbitrary SQL:

```typescript
// Bad - SQL injection via string interpolation
const result = await db.$queryRawUnsafe(`SELECT * FROM users WHERE id = ${userId}`);

// Good - parameterized query with Prisma
const result = await prisma.user.findUnique({ where: { id: userId } });

// Good - parameterized raw query (tagged template)
const result = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;
```

## Environment Variables

- Never expose secrets in client-side code
- Use `.env` files with proper `.gitignore`
- Use `NEXT_PUBLIC_` prefix only for public variables
- Rotate secrets regularly

## API Security

- Use HTTPS everywhere
- Implement rate limiting
- Validate Content-Type headers
- Configure CORS properly
- Use API keys for external services

## Dependency Security

- Keep dependencies updated
- Run `npm audit` regularly
- Review new dependencies before adding
- Use exact versions in production

## Security Headers

Always set these HTTP response headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=()
```

```typescript
// Next.js middleware or custom server
app.use(helmet()); // sets all security headers automatically
```

## CSRF Protection

Use the **Double Submit Cookie** pattern or **SameSite cookie** as defense-in-depth:

```typescript
// Good - csrf-csrf (Double Submit Cookie pattern)
import { doubleCsrf } from "csrf-csrf";

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: "__csrf",
  cookieOptions: { httpOnly: true, secure: true, sameSite: "strict" },
});

app.use(doubleCsrfProtection);

// Good - SameSite cookie as defense-in-depth
res.cookie("session", token, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
});
```

## IDOR Prevention (A01 -- Broken Access Control)

Never expose sequential IDs. Always verify resource ownership server-side:

```typescript
// Bad - user can change the ID to access other users' data
router.get("/orders/:id", async (req, res) => {
  const order = await orderRepo.findById(req.params.id);
  res.json(order);
});

// Good - ownership check
router.get("/orders/:id", authenticate, async (req, res) => {
  const order = await orderRepo.findById(req.params.id);
  if (!order || order.userId !== req.user.id) throw new ForbiddenError();
  res.json(order);
});
```

- Use UUIDs instead of sequential integer IDs for public-facing resources
- Apply ownership filters at the query level, not after fetching

## Password Storage (A07 -- Auth Failures)

Use **Argon2id** as the default password hashing algorithm:

```typescript
import argon2 from "argon2";

// Good - Argon2id with recommended parameters
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
});

const isValid = await argon2.verify(hash, password);
```

- If Argon2id is unavailable, use bcrypt with cost factor >= 12
- Never use MD5, SHA-1, or unsalted SHA-256 for passwords
- Always use a unique, random salt per password

## Credential Stuffing Prevention (A07 -- Auth Failures)

```typescript
// Good - rate limit auth endpoints
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: { code: "TOO_MANY_REQUESTS" } },
  skipSuccessfulRequests: true,
});

app.post("/api/auth/login", authLimiter, loginHandler);
app.post("/api/auth/register", authLimiter, registerHandler);
```

- Lock account after 10 failed attempts (temporary lockout, not permanent)
- Implement CAPTCHA after 5 consecutive failures
- Log failed attempts with IP, timestamp -- alert on unusual patterns

## SSRF Prevention (A10 -- Server-Side Request Forgery)

Never fetch user-supplied URLs directly from the server:

```typescript
// Bad - user controls the URL the server fetches
app.post("/fetch-preview", async (req, res) => {
  const data = await fetch(req.body.url);
  res.json(await data.json());
});

// Good - allowlist of permitted domains
const ALLOWED_DOMAINS = ["api.trusted.com", "cdn.myservice.com"];

function validateFetchUrl(url: string): void {
  const parsed = new URL(url);
  if (!ALLOWED_DOMAINS.includes(parsed.hostname)) {
    throw new ValidationError("URL not in allowlist", {});
  }
  if (parsed.protocol !== "https:") {
    throw new ValidationError("Only HTTPS URLs are permitted", {});
  }
}
```

- Block requests to private IP ranges (`10.x`, `172.16.x`, `192.168.x`, `127.x`, `169.254.x`)
- Use an allowlist -- never a denylist alone

## Secrets Management (A02 -- Cryptographic Failures)

```typescript
// Bad - secret in source code
const API_KEY = "sk-1234abcd";

// Bad - secret in logs
logger.info(`Connecting with key: ${process.env.API_KEY}`);

// Good - load from env, never log
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error("API_KEY environment variable is required");
logger.info("Connecting to external API");
```

- Rotate secrets on a schedule -- minimum every 90 days
- Use a secrets manager in production (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)
- Audit secret access: log who accessed what secret and when
- Use short-lived credentials where possible (OIDC, IAM roles, Workload Identity)

## Gotchas

- **CORS is not a security measure** -- it only controls browser access. Server-side authorization is always required regardless of CORS config.
- **Logging `req.body` logs passwords** -- never log full request bodies on auth endpoints.
- **Never trust a user-supplied `userId`** in the request body for ownership -- always use `req.user.id` from the verified JWT/session.
- **`httpOnly` cookies don't protect against CSRF** -- combine with `SameSite=Strict` or CSRF tokens.
- **HTTPS does not prevent Broken Access Control** -- encryption is transport-level only; authorization must be enforced at the application level.

## GDPR / Data Privacy

- Log only what is necessary -- no PII in logs by default
- Implement data retention policies and deletion endpoints
- Document what personal data is stored and why
- Provide data export functionality for user data requests
- Anonymize data in non-production environments
