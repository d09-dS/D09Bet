# dotBet – Wettplattform mit virtuellen Tokens

> **Ziel:** Eine moderne, interne Wettplattform, auf der Mitarbeiter mit virtuellen Tokens auf Events wetten können. Kein echtes Geld – nur Spaß, Strategie und Ranking.

---

## 1. Vision & Überblick

| Aspekt | Detail |
|---|---|
| **Produkt** | Token-basierte Wettplattform (intern / Fun) |
| **Zielgruppe** | Mitarbeiter |
| **Authentifizierung** | Username + Passwort (kein OAuth) |
| **Token-Modell** | Jeder User bekommt 1.000 Tokens bei Registrierung + täglichen Bonus |
| **Quoten** | Dynamisch – passen sich an das Wettverhalten an |
| **Sprachen** | Deutsch (Standard), Englisch |
| **Theme** | Dark Mode (Standard) |

---

## 2. Tech-Stack

### Backend
| Technologie | Version | Zweck |
|---|---|---|
| Java | 17 LTS | Programmiersprache |
| Spring Boot | 3.2.5 | Web-Framework |
| Spring Security | 6.x | Authentifizierung & Autorisierung |
| Spring Data JPA | 3.x | ORM / Datenzugriff |
| Flyway | 9.x | Datenbank-Migrationen |
| JWT (jjwt) | 0.12.6 | Stateless Token-Auth |
| PostgreSQL | 16 | Relationale Datenbank |
| Redis | 7 | Caching & Sessions |
| WebSocket (STOMP) | – | Live-Quoten-Updates |
| SpringDoc OpenAPI | 2.3.0 | API-Dokumentation (Swagger UI) |
| Lombok | – | Boilerplate-Reduktion |
| Gradle | 8.5 | Build-Tool |

### Frontend
| Technologie | Version | Zweck |
|---|---|---|
| Next.js | 16 (App Router) | React-Framework |
| TypeScript | 5.x | Typsicherheit |
| TailwindCSS | v4 | Styling |
| shadcn/ui | v4 (base-ui) | UI-Komponenten |
| next-intl | – | i18n (DE/EN) |
| NextAuth | v4 | Auth-Session-Management |
| Zustand | – | Client-State (Wettschein) |
| React Query | v5 | Server-State & Caching |
| Recharts | – | Diagramme (Quoten-Verlauf) |
| STOMP.js | – | WebSocket-Client |
| Lucide React | – | Icons |

### Infrastruktur
| Tool | Zweck |
|---|---|
| Prisma Accelerate | Cloud-Datenbank (PostgreSQL via Prisma) |
| Bruno | API-Testing (statt Postman) |

---

## 3. Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js 16 Frontend (:3000)              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐  │  │
│  │  │ Landing  │ │ Events   │ │ Profil │ │   Admin   │  │  │
│  │  │  Page    │ │ + Detail │ │ + Bets │ │   Panel   │  │  │
│  │  └──────────┘ └──────────┘ └────────┘ └───────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐  │  │
│  │  │  Login   │ │ Register │ │Leader- │ │ Wettschein│  │  │
│  │  │  Page    │ │  Page    │ │ board  │ │  (Zustand)│  │  │
│  │  └──────────┘ └──────────┘ └────────┘ └───────────┘  │  │
│  │                                                       │  │
│  │  [NextAuth] [React Query] [next-intl] [STOMP.js]     │  │
│  └──────────────────────┬────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │ REST + WebSocket
┌─────────────────────────┼───────────────────────────────────┐
│              Spring Boot Backend (:8080)                     │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │                   API Layer                            │  │
│  │  /api/auth/*   /api/events/*   /api/bets/*            │  │
│  │  /api/users/*  /api/leaderboard  /api/admin/*         │  │
│  │  /ws (STOMP)                                          │  │
│  └──────────────────────┬────────────────────────────────┘  │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │                 Service Layer                          │  │
│  │  AuthService  EventService  BetService                │  │
│  │  TokenService OddsEngine   LeaderboardService         │  │
│  │  SystemSettingService  AdminAuditService               │  │
│  └──────────────────────┬────────────────────────────────┘  │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │               Data Layer (JPA + Flyway)               │  │
│  │  User  Event  Market  Outcome  Bet  TokenTransaction  │  │
│  │  Category  OddsHistory  AdminAuditLog  SystemSetting  │  │
│  └──────────────────────┬────────────────────────────────┘  │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │                  Security Layer                        │  │
│  │         JWT Filter → SecurityConfig → CORS            │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
    ┌──────────┴──────────┐    ┌──────────┴──────────┐
    │   PostgreSQL 16     │    │     Redis 7          │
    │   (:5432)           │    │     (:6379)          │
    │   dotbet_db         │    │   Cache / Sessions   │
    └─────────────────────┘    └─────────────────────┘
```

---

## 4. Datenbank-Schema (ER-Übersicht)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │  categories  │       │system_settings│
│──────────────│       │──────────────│       │──────────────│
│ id (UUID)    │       │ id (SERIAL)  │       │ key (PK)     │
│ username     │       │ name         │       │ value        │
│ email        │       │ slug         │       │ description  │
│ password     │       │ icon_name    │       └──────────────┘
│ role         │       │ sort_order   │
│ token_balance│       └──────┬───────┘
│ locale       │              │
└──────┬───────┘              │
       │                      │
       │         ┌────────────┴───────────┐
       │         │        events          │
       │         │────────────────────────│
       │         │ id (UUID)              │
       │         │ title / title_en       │
       │         │ description            │
       │         │ category_id → categories│
       │         │ created_by → users     │
       │         │ status (ENUM)          │
       │         │ start_time / end_time  │
       │         │ is_featured            │
       │         └────────────┬───────────┘
       │                      │
       │         ┌────────────┴───────────┐
       │         │       markets          │
       │         │────────────────────────│
       │         │ id (UUID)              │
       │         │ event_id → events      │
       │         │ name / name_en         │
       │         │ type (ENUM)            │
       │         │ status (ENUM)          │
       │         │ margin_factor          │
       │         └────────────┬───────────┘
       │                      │
       │         ┌────────────┴───────────┐
       │         │      outcomes          │
       │         │────────────────────────│
       │         │ id (UUID)              │
       │         │ market_id → markets    │
       │         │ name / name_en         │
       │         │ initial_odds           │
       │         │ current_odds           │
       │         │ total_staked           │
       │         │ result_status (ENUM)   │
       │         └────────────┬───────────┘
       │                      │
  ┌────┴──────────────────────┴────┐
  │            bets                │
  │────────────────────────────────│
  │ id (UUID)                      │
  │ user_id → users                │
  │ outcome_id → outcomes          │
  │ stake                          │
  │ odds_at_placement              │
  │ potential_win                  │
  │ status (ENUM)                  │
  └────────────────────────────────┘

  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐
  │ token_transactions │  │   odds_history     │  │ admin_audit_log  │
  │────────────────────│  │────────────────────│  │──────────────────│
  │ user_id → users    │  │ outcome_id         │  │ admin_id → users │
  │ type (ENUM)        │  │ old_odds / new_odds│  │ action           │
  │ amount             │  │ trigger (ENUM)     │  │ entity_type      │
  │ balance_after      │  │ changed_by → users │  │ entity_id        │
  │ reference_type/id  │  └────────────────────┘  │ details (JSON)   │
  └────────────────────┘                          └──────────────────┘
```

---

## 5. Rollen & Berechtigungen

| Rolle | Rechte |
|---|---|
| **GUEST** | Nur lesen (Events ansehen, Quoten sehen) |
| **USER** | Wetten platzieren, Profil, Leaderboard |
| **MODERATOR** | Events erstellen, Märkte verwalten, Ergebnisse setzen |
| **ADMIN** | Alles + User-Verwaltung, System-Settings, Audit-Log |

---

## 6. API-Endpunkte

### Auth (`/api/auth`)
| Method | Pfad | Beschreibung | Auth |
|---|---|---|---|
| POST | `/register` | Neuen User registrieren | – |
| POST | `/login` | Login → JWT | – |
| POST | `/refresh` | Token erneuern | – |

### Events (`/api/events`)
| Method | Pfad | Beschreibung | Auth |
|---|---|---|---|
| GET | `/` | Events auflisten (Filter, Paging) | – |
| GET | `/{id}` | Event-Detail mit Märkten & Quoten | – |
| GET | `/featured` | Featured Events für Startseite | – |
| POST | `/` | Event erstellen | MODERATOR+ |
| PUT | `/{id}` | Event bearbeiten | MODERATOR+ |
| PATCH | `/{id}/status` | Status ändern | MODERATOR+ |

### Markets (`/api/events/{eventId}/markets`)
| Method | Pfad | Beschreibung | Auth |
|---|---|---|---|
| POST | `/` | Markt hinzufügen | MODERATOR+ |
| PUT | `/{marketId}` | Markt bearbeiten | MODERATOR+ |
| POST | `/{marketId}/settle` | Ergebnis setzen | MODERATOR+ |

### Bets (`/api/bets`)
| Method | Pfad | Beschreibung | Auth |
|---|---|---|---|
| POST | `/` | Wette platzieren | USER+ |
| GET | `/my` | Eigene Wetten (Paging) | USER+ |
| GET | `/my/stats` | Eigene Wettstatistiken | USER+ |

### Users (`/api/users`)
| Method | Pfad | Beschreibung | Auth |
|---|---|---|---|
| GET | `/me` | Eigenes Profil | USER+ |
| PUT | `/me` | Profil bearbeiten | USER+ |
| GET | `/me/transactions` | Token-Transaktionen | USER+ |

### Leaderboard (`/api/leaderboard`)
| Method | Pfad | Beschreibung | Auth |
|---|---|---|---|
| GET | `/` | Top-Spieler (Profit, Win-Rate) | – |

### Admin (`/api/admin`)
| Method | Pfad | Beschreibung | Auth |
|---|---|---|---|
| GET | `/users` | User-Liste | ADMIN |
| PATCH | `/users/{id}/role` | Rolle ändern | ADMIN |
| PATCH | `/users/{id}/tokens` | Tokens anpassen | ADMIN |
| GET | `/audit-log` | Audit-Log einsehen | ADMIN |
| GET | `/settings` | System-Settings lesen | ADMIN |
| PUT | `/settings/{key}` | Setting ändern | ADMIN |

### Odds History (`/api/odds-history`)
| Method | Pfad | Beschreibung | Auth |
|---|---|---|---|
| GET | `/market/{marketId}` | Quoten-Verlauf für Chart | – |

### Daily Bonus (`/api/users/me/daily-bonus`)
| Method | Pfad | Beschreibung | Auth |
|---|---|---|---|
| GET | `/` | Prüfen ob Bonus verfügbar | USER+ |
| POST | `/` | Bonus abholen | USER+ |

### WebSocket (`/ws`)
| Destination | Beschreibung |
|---|---|
| `/topic/odds/{marketId}` | Live-Quoten-Updates nach Wettplatzierung |
| `/topic/events` | Event-Status-Änderungen |

---

## 7. Dynamisches Quoten-Modell

```
Formel: currentOdds = (totalPool / stakeOnOutcome) × marginFactor

Beispiel (3 Outcomes, marginFactor = 1.05):
  Team A: 500 Tokens gestaked → Odds = (1500 / 500) × 1.05 = 3.15
  Team B: 800 Tokens gestaked → Odds = (1500 / 800) × 1.05 = 1.97
  Draw:   200 Tokens gestaked → Odds = (1500 / 200) × 1.05 = 7.88

→ Quoten sinken, je mehr auf ein Ergebnis gewettet wird.
→ Quoten steigen für weniger gewettete Ergebnisse.
→ marginFactor sichert immer eine leichte "Marge" (konfigurierbar).
```

---

## 8. Token-Wirtschaft

| Aktion | Token-Effekt |
|---|---|
| Registrierung | +1.000 Tokens |
| Täglicher Bonus | +50 Tokens (konfigurierbar) |
| Wette platzieren | −Stake |
| Wette gewonnen | +Stake × Odds |
| Wette void/abgebrochen | +Stake (Rückerstattung) |
| Admin-Anpassung | ±Betrag |
| Challenge-Reward | +Bonus (zukünftig) |

---

## 9. Phasenplan

### Phase 1 — Fundament ✅
> **Status: ABGESCHLOSSEN**

- [x] Prisma Accelerate (Cloud-Datenbank)
- [x] Backend-Skeleton (Spring Boot 3.2.5, Gradle, Java 17)
- [x] 10 Entities + 10 Enums + 8 Repositories
- [x] 6 Flyway-Migrationen (vollständiges DB-Schema)
- [x] JWT-Authentifizierung (Register, Login, Refresh)
- [x] TokenService + SystemSettingService
- [x] Frontend-Skeleton (Next.js 16, shadcn/ui v4, TailwindCSS v4)
- [x] i18n-Setup (Deutsch + Englisch)
- [x] dotBet Dark Theme mit Brand-Farben
- [x] NextAuth-Integration + Login/Register-Seiten
- [x] Landing Page mit Hero & How-it-works
- [x] Bruno-Collection (Auth-Requests)

### Phase 2 — Kernfunktionalität ✅
> **Status: ABGESCHLOSSEN**

- [x] Event/Market/Outcome DTOs + Services + REST-Controller
- [x] BetService mit dynamischer Quotenberechnung
- [x] OddsEngine + OddsHistory-Tracking
- [x] LeaderboardService + Controller
- [x] User-Profil-Endpunkte
- [x] WebSocket-Config + Live-Odds-Push
- [x] Frontend: Events-Seite (Liste + Filterung)
- [x] Frontend: Event-Detail-Seite mit Wettschein
- [x] Frontend: Leaderboard-Seite
- [x] Frontend: Profil-Seite (Wetten-History, Transaktionen)
- [x] Frontend: Admin-Panel (Basis)
- [x] Frontend: Navigation Header + Landing Page Live-Daten
- [x] Bruno: Event-, Bet-, Admin-Requests

### Phase 3 — Admin & Erweiterungen ✅
> **Status: ABGESCHLOSSEN**

- [x] Admin-Panel: Events CRUD (Create, Status-Übergänge, Markets+Outcomes hinzufügen)
- [x] Admin-Panel: Ergebnisse setzen (Settlement UI mit Gewinner-Auswahl)
- [x] Admin-Panel: User-Verwaltung + Token-Anpassung (Modal-Dialog)
- [x] Admin-Panel: Audit-Log-Ansicht
- [x] Admin-Panel: System-Settings
- [x] Quoten-Verlauf-Chart (Recharts LineChart auf Event-Detail)
- [x] Daily-Bonus-Mechanik (Backend-Service + Frontend-Banner)
- [x] Backend: OddsHistoryController (REST-API für Chart-Daten)
- [x] i18n: Admin + DailyBonus Übersetzungen (DE/EN)
- [x] Responsive Optimierung (Header Mobile Menu, Leaderboard, Landing Page)

### Phase 4 — Polish & Go-Live �
> **Status: IN ARBEIT**

- [x] E2E-Tests (Playwright: Landing, Auth, Events, Navigation)
- [x] Performance-Optimierung (Redis-Caching für Leaderboard via @Cacheable/@CacheEvict)
- [x] Error-Handling (Backend: 8 neue Exception-Handler + Logging; Frontend: error.tsx + not-found.tsx)
- [x] Deployment-Setup (Prisma Accelerate Cloud DB, Vercel-kompatibel)
- [x] Logo-Integration (favicon.svg, Open Graph Meta, theme-color)
- [ ] Team-Review & Bugfixes
- [ ] Go-Live intern

---

## 10. Projektstruktur

```
dotBet/
├── README.md
├── .gitignore
│
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── components.json          # shadcn/ui Config
│   ├── .env
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── messages/                # de.json, en.json
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       # Root Layout (Dark Mode)
│       │   ├── page.tsx         # Redirect → /de
│       │   ├── api/auth/        # NextAuth Route
│       │   └── [locale]/
│       │       ├── layout.tsx   # Locale Layout (Header, Footer)
│       │       ├── page.tsx     # Landing Page
│       │       └── (auth)/      # Login, Register
│       ├── components/
│       │   ├── ui/              # shadcn/ui Components
│       │   ├── layout/          # Header
│       │   └── providers.tsx    # Session + QueryClient
│       ├── i18n/                # routing, navigation, request
│       ├── lib/                 # api.ts, auth.ts, prisma.ts, utils.ts
│       ├── stores/              # betSlipStore.ts (Zustand)
│       └── types/               # TypeScript Types + NextAuth
│
└── bruno/
    ├── bruno.json
    ├── environments/Local.bru
    └── auth/                    # Register, Login, Refresh
```

---

## 11. Lokale Entwicklung starten

```bash
# 1. Dependencies installieren
cd frontend
npm install

# 2. .env-Datei erstellen mit:
# DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=DEIN_KEY
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=dein-nextauth-secret
# JWT_SECRET=dein-jwt-secret-min-256-bit

# 3. Datenbank initialisieren
npm run db:push
npm run db:seed

# 4. Frontend starten (Port 3000)
npm run dev

# 5. URLs
# Frontend:  http://localhost:3000
# Prisma Studio: npx prisma studio
```

---

## 12. Brand & Design

| Element | Wert |
|---|---|
| **Primary** | `#5ce0d2` (Türkis) |
| **Accent** | `#e84e8a` (Pink / Highlight) |
| **Background (Dark)** | `#0f1923` |
| **Card (Dark)** | `#1a2736` |
| **Theme** | Dark Mode (Standard) |
| **Font** | Geist Sans + Geist Mono |
| **Icons** | Lucide React |

---

*Erstellt: April 2026*
