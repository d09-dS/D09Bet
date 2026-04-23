<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Splash Screen / Chip-Roll Animation

The app uses a branded "Chip-Roll" splash animation (`src/components/SplashScreen.tsx`) that shows the dotBet logo with the casino chip rolling in from the left.

### When it triggers:
| Trigger | Mechanism | File |
|---------|-----------|------|
| **First visit** (cold load) | `sessionStorage` — once per browser session | `SplashScreen.tsx` |
| **After login** | `sessionStorage("dotbet_login_splash")` set before redirect | `login/page.tsx` |
| **After registration** | `useSplash().triggerSplash()` called on success | `register/page.tsx` |
| **After logout** | `sessionStorage("dotbet_logout_splash")` set before `signOut()` | `Header.tsx` |

### Architecture:
- `SplashScreen` wraps the app inside `Providers` (`providers.tsx`)
- Exposes `useSplash()` hook with `triggerSplash()` for in-page triggers (no page reload needed)
- Uses `sessionStorage` flags for cross-page triggers (login/logout cause hard navigations)
- Animation built with Framer Motion (~2.8s total duration)

### Adding the splash to a new trigger:
- **Same page (no redirect):** Import `useSplash` and call `triggerSplash()`
- **Cross-page (redirect):** Set `sessionStorage.setItem("dotbet_login_splash", "1")` before navigating (the SplashScreen checks for this key on mount)

## Logo

The logo is an SVG at `public/dotbet_logo.svg` — "dotBet" text with a casino chip as the "o". Referenced in `Header.tsx` via Next.js `<Image>`.

## Notifications

Admin notifications are displayed via `NotificationBell` component in the Header. Navigation mapping:
- `entityType: "USER"` → `/admin?tab=users`
- `entityType: "EVENT"` → `/admin?tab=events`

Notifications are created via `notifyAdmins()` in `src/lib/notifications.ts`.

## Cron Jobs (GitHub Actions)

Scheduled tasks run via **GitHub Actions** (not Vercel Cron — free tier doesn't support it).

| Job | Schedule | Workflow File | API Endpoint |
|-----|----------|---------------|--------------|
| **Daily Odds Update** | `0 0 * * *` (midnight UTC) | `.github/workflows/cron-daily-odds.yml` | `/api/cron/daily-odds` |
| **Close Expired Events** | `*/15 * * * *` (every 15 min) | `.github/workflows/cron-close-expired.yml` | `/api/cron/close-expired` |

### Required GitHub Secrets:
- `APP_URL` — Production URL (e.g. `https://your-app.vercel.app`)
- `CRON_SECRET` — Must match the `CRON_SECRET` env var set in Vercel

### Manual trigger:
Both workflows support `workflow_dispatch` — you can run them manually from the GitHub Actions tab.

## Rate Limiting (Upstash)

Auth endpoints (`/api/auth/login`, `/register`, `/refresh`) are rate-limited via `@upstash/ratelimit` + `@upstash/redis`.

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 5 requests | 15 min |
| `/api/auth/register` | 3 requests | 1 hour |
| `/api/auth/refresh` | 20 requests | 15 min |

### Required Vercel env vars (optional for local dev):
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

If these are not set, rate limiting is silently disabled (no-op). Get a free Redis instance at https://console.upstash.com.

Implementation: `src/lib/rate-limit.ts` — use `checkRateLimit(req, "login" | "register" | "refresh")`.
