# dotBet – Token-basierte Wettplattform

Eine moderne Wettplattform mit virtuellen Tokens, dynamischen Quoten und Gamification-Elementen.

## Tech Stack

| Komponente  | Technologie                                        |
| ----------- | -------------------------------------------------- |
| Fullstack   | Next.js 16, TypeScript, React 19                   |
| Styling     | TailwindCSS 4, shadcn/ui                           |
| Datenbank   | PostgreSQL 16 (via Prisma ORM + Prisma Accelerate) |
| Auth        | NextAuth.js (Credentials + JWT)                    |
| State       | Zustand, React Query                               |
| i18n        | next-intl (DE / EN)                                |
| API Testing | Bruno                                              |

## Projektstruktur

```
dotBet/
├── bruno/             → Bruno API Collection
├── docs/              → Architektur-Dokumentation
├── prisma/            → Prisma Schema & Seed
├── src/
│   ├── app/
│   │   ├── [locale]/  → Seiten (i18n Routing)
│   │   └── api/       → API Routes (Backend)
│   ├── components/    → React-Komponenten
│   ├── hooks/         → Custom Hooks
│   ├── i18n/          → Internationalisierung
│   └── lib/           → Auth, Prisma, Utils
└── package.json
```

## Schnellstart

```bash
git clone <repo-url>
cd dotBet/frontend
npm install
```

`.env`-Datei erstellen:

```env
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=DEIN_KEY
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dein-nextauth-secret
JWT_SECRET=dein-jwt-secret-min-256-bit
```

Datenbank initialisieren & starten:

```bash
npm run db:push
npm run db:seed
npm run dev
```

### Verfügbare Dev-Accounts (nach Seed)

| User      | Passwort   | Rolle |
| --------- | ---------- | ----- |
| admin     | dotbet_dev | ADMIN |
| user      | dotbet_dev | USER  |

## Nützliche Befehle

| Befehl             | Beschreibung                   |
| ------------------ | ------------------------------ |
| `npm run dev`      | Dev-Server starten (Turbopack) |
| `npm run build`    | Production Build               |
| `npm run lint`     | ESLint                         |
| `npm run db:push`  | Prisma Schema auf DB anwenden  |
| `npm run db:seed`  | Testdaten einspielen           |
| `npm run test:e2e` | Playwright E2E-Tests           |

## Zusätzliche Tools

- **Prisma Studio**: `npx prisma studio` – Web-UI zur Datenbankverwaltung
- **Bruno**: API Collection unter `bruno/` – Base-URL: `http://localhost:3000/api`

## Features

- Virtuelle Token-Economy (Starttokens, Daily Bonus, Gewinne)
- Dynamische Quoten (passen sich an Wettverhalten an)
- Leaderboards (All-Time, Weekly, Monthly)
- Chip-Roll Splash Animation (Branding-Animation beim Start, Login, Registrierung & Logout)
- Admin-Benachrichtigungen (In-App + E-Mail) bei Registrierungen & Wettanfragen
- User-erstellte Wetten mit Admin-Review-Workflow
- Rollen: Guest, User, Admin
- Zweisprachig (Deutsch / English)
- Dark Mode (Default)

## Lizenz

Intern
