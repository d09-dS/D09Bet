# dotBet - Live Demo Script

> Geschaetzte Dauer: **15-20 Minuten**
> Voraussetzung: App laeuft (`npm run dev`), DB ist geseeded (`npx prisma db seed`)

## Testaccounts

| Rolle     | Username    | Passwort     |
|-----------|-------------|--------------|
| Admin     | `admin`     | `dotbet_dev` |
| Moderator | `moderator` | `dotbet_dev` |
| User      | `user`      | `dotbet_dev` |

---

## Teil 1: Landing Page & Oeffentlicher Bereich (2 Min)

### 1.1 Landing Page zeigen
- **URL:** `http://localhost:3000`
- Zeigen: Hero-Section, "So funktioniert's"-Schritte, Feature-Karten
- Leaderboard-Preview und CTA-Section nach unten scrollen
- **Highlight:** Statistiken (1.000 Starter-Tokens, 50+ Daily Bonus, 4 Rollen)

### 1.2 Sprachwechsel
- Oben rechts auf **EN** klicken -> Seite wechselt zu Englisch
- Zurueck auf **DE** klicken
- **Highlight:** Komplett zweisprachig (DE/EN), alle Inhalte uebersetzt

### 1.3 Dark/Light Mode
- Theme-Toggle im Header klicken
- **Highlight:** Vollstaendiges Dark/Light Theme

---

## Teil 2: Registrierung & Login (2 Min)

### 2.1 Neuen User registrieren
- Auf "Registrieren" klicken
- Eingeben: Username `demo_user`, Email `demo@test.de`, Passwort `test1234`
- Absenden -> **Erfolgsmeldung** mit Hinweis: "Admin muss Account freischalten"
- **Highlight:** Neue User starten inaktiv, Admin-Freischaltung noetig

### 2.2 Login mit Admin
- Auf "Anmelden" klicken
- Username: `admin`, Passwort: `dotbet_dev`
- **Highlight:** Daily Login Bonus wird als Toast angezeigt (z.B. "+2 Tokens")
- Weiterleitung zu Events-Seite

---

## Teil 3: Admin-Panel (4 Min)

> Eingeloggt als `admin`

### 3.1 User freischalten
- Navigation: **Admin** (im User-Dropdown oben rechts)
- Tab **Users** oeffnen
- `demo_user` in der Liste finden
- Status-Toggle klicken -> Account wird aktiviert
- **Highlight:** Rollenbasierte Zugriffskontrolle, User-Verwaltung

### 3.2 Rollen aendern
- Bei `demo_user` die Rolle von "USER" auf z.B. "MODERATOR" aendern
- **Highlight:** 4 Rollen-System (GUEST, USER, MODERATOR, ADMIN)

### 3.3 Token-Balance anpassen
- Bei einem User auf das Stift-Icon neben der Token-Balance klicken
- Betrag eingeben (z.B. `+500`), Grund: "Demo Bonus"
- Bestaetigen -> Balance wird sofort aktualisiert
- **Highlight:** Admin-Token-Verwaltung mit Transaktions-Log

### 3.4 Event erstellen
- Tab **Events** oeffnen
- Formular ausfuellen:
  - Titel (DE): `Champions League Finale 2025`
  - Titel (EN): `Champions League Final 2025`
  - Beschreibung (DE): `Wer gewinnt das CL-Finale?`
  - Beschreibung (EN): `Who wins the CL Final?`
  - Startzeit: Datum in der Zukunft waehlen
  - Kategorie: Sport
- **Erstellen** klicken -> Event erscheint als DRAFT

### 3.5 Market mit Outcomes hinzufuegen
- Beim neuen Event auf "Details" klappen
- **Market hinzufuegen:**
  - Name (DE): `Sieger`
  - Name (EN): `Winner`
  - Typ: WINNER
  - Margin: 0.95
  - Outcome 1: `Real Madrid` - Quote 1.80
  - Outcome 2: `FC Barcelona` - Quote 2.10
  - (Optional) Outcome 3: `Unentschieden` - Quote 3.50
- **Highlight:** Flexible Market-Typen (WINNER, YES_NO, OVER_UNDER, CUSTOM)

### 3.6 Event-Status aendern
- Status-Buttons zeigen: DRAFT -> SCHEDULED -> OPEN
- Auf **OPEN** setzen, damit Wetten platziert werden koennen
- **Highlight:** Vollstaendiger Event-Lifecycle (DRAFT -> SCHEDULED -> OPEN -> CLOSED -> SETTLED)

### 3.7 System-Einstellungen zeigen
- Tab **Settings** oeffnen
- Zeigen: initial_tokens, daily_bonus_amount, min/max Einsatz, Quoten-Limits
- Einen Wert aendern (z.B. daily_bonus_amount auf 5)
- **Highlight:** Dynamische System-Konfiguration ohne Code-Aenderung

### 3.8 Audit-Log zeigen
- Tab **Audit Log** oeffnen
- Zeigen: Alle Admin-Aktionen werden protokolliert (Zeitstempel, Aktion, Admin, Details)
- **Highlight:** Lueckenlose Nachverfolgung aller Admin-Aktionen

---

## Teil 4: Events & Wetten (4 Min)

> Am besten: Zweites Browser-Fenster oeffnen und als `user` einloggen

### 4.1 Events durchsuchen
- Navigation: **Events**
- **Suchfeld** nutzen: z.B. "Champions" eingeben
- **Status-Filter:** Auf "OPEN" klicken -> nur offene Events
- **Kategorie-Filter:** "Sport" auswaehlen
- **Highlight:** Suche, Multi-Filter, Pagination

### 4.2 Favoriten
- Bei einem Event auf den **Stern** klicken -> wird favorisiert
- **Favoriten-Filter** aktivieren -> zeigt nur markierte Events
- **Highlight:** Lokale Persistenz (LocalStorage)

### 4.3 Event-Detail & Quoten
- Ein Event anklicken -> Detail-Seite
- Zeigen:
  - Event-Info (Titel, Status-Badge, Kategorie, Beschreibung, Startzeit)
  - Markets mit Outcomes und **aktuellen Quoten**
  - **Quoten-Verlauf-Chart** (Liniendiagramm, falls schon Wetten platziert)
- **Highlight:** Quoten-Trend-Pfeile zeigen Veraenderung in %

### 4.4 Wette platzieren
- Auf einen Outcome klicken (z.B. "Real Madrid @ 1.80")
- **Bet Slip** oeffnet sich rechts
- Einsatz eingeben oder Quick-Select nutzen (5, 10, 25, 50, Max)
- Zeigen: Potentieller Gewinn wird live berechnet (Einsatz x Quote)
- **"Wette platzieren"** klicken
- **Highlight:** Einsatz-Limits, Quote zum Zeitpunkt der Wette wird gespeichert

### 4.5 Quoten-Aenderung demonstrieren
- Noch eine Wette auf denselben oder anderen Outcome platzieren
- Zeigen: **Quoten haben sich veraendert** (dynamische Quoten basierend auf Einsatzpool)
- **Highlight:** Automatische Quoten-Neuberechnung nach jeder Wette

---

## Teil 5: Profil & Analytics (3 Min)

> Eingeloggt als `user` (oder wer Wetten platziert hat)

### 5.1 Profil-Dashboard
- Navigation: **Profil** (im User-Dropdown)
- Zeigen: 4 Stat-Karten (Token-Balance, Anzahl Wetten, Win Rate, Profit)
- **Highlight:** Ueberblick auf einen Blick

### 5.2 Meine Wetten
- Tab **Meine Wetten**
- Filter zeigen: Alle, Offen, Gewonnen, Verloren
- Wett-Karten mit: Event, Market, Outcome, Einsatz x Quote = Potentieller Gewinn
- **Highlight:** Komplette Wett-Historie

### 5.3 Analytics
- Tab **Analytics**
- Zeigen:
  - **Kreisdiagramm:** Verteilung (Gewonnen, Verloren, Offen, Void)
  - **Kennzahlen:** Total Bets, Win Rate, Profit, Staked, Won
  - **Balance-Verlauf:** Area-Chart ueber Zeit
- **Highlight:** Visuelle Auswertung mit Recharts

### 5.4 Transaktionen
- Tab **Transaktionen**
- Zeigen: INITIAL_ALLOCATION, BET_PLACED, DAILY_BONUS, etc.
- Jede Transaktion mit Betrag, Balance danach, Zeitstempel
- **Highlight:** Vollstaendiges Transaktions-Log, Nachvollziehbarkeit

---

## Teil 6: Market Settlement (3 Min)

> Zurueck zum Admin-Fenster (eingeloggt als `admin`)

### 6.1 Event schliessen
- Admin -> Events -> Das CL-Event finden
- Status auf **CLOSED** setzen (keine neuen Wetten mehr moeglich)

### 6.2 Market settlen
- Beim Market auf "Details" klappen
- **Gewinner-Outcome** auswaehlen (z.B. "Real Madrid")
- **"Settle"** klicken -> Bestaetigen
- **Was passiert im Hintergrund:**
  - Alle Wetten auf "Real Madrid" -> Status WON, Tokens werden gutgeschrieben
  - Alle anderen Wetten -> Status LOST
  - Gewinn = Einsatz x Quote zum Zeitpunkt der Wette
  - Audit-Log-Eintrag wird erstellt

### 6.3 Ergebnis verifizieren
- Zum User-Fenster wechseln
- **Profil** oeffnen -> Token-Balance hat sich erhoeht (wenn gewonnen)
- **Meine Wetten** -> Status ist jetzt WON/LOST
- **Transaktionen** -> BET_WON Transaktion sichtbar
- **Highlight:** End-to-End Wett-Lifecycle komplett

---

## Teil 7: Leaderboard (1 Min)

### 7.1 Rangliste zeigen
- Navigation: **Leaderboard**
- Zeigen: Rangliste sortiert nach Profit
- Top 3 mit speziellen Icons (Pokal, Medaille)
- Pro Spieler: Profit, Anzahl Wetten, Win Rate
- **Highlight:** Gamification-Element, motiviert zum Weiterspielen

---

## Teil 8: Einstellungen & Responsiveness (1 Min)

### 8.1 User-Einstellungen
- Navigation: **Settings** (im User-Dropdown)
- Bio eingeben, Sprache wechseln
- **Highlight:** Personalisierung

### 8.2 Mobile Ansicht
- Browser-Fenster verkleinern oder DevTools Mobile-View
- Zeigen: Hamburger-Menu, Touch-freundliche Karten, responsive Grid
- **Highlight:** Mobile-first Design

---

## Zusammenfassung (Talking Points)

Am Ende der Demo koennt ihr diese Punkte hervorheben:

| Feature | Technologie |
|---------|-------------|
| Frontend | Next.js (App Router), React, TypeScript |
| Styling | Tailwind CSS, Shadcn/ui |
| Auth | NextAuth.js mit JWT |
| Datenbank | PostgreSQL + Prisma ORM (Accelerate) |
| State | Zustand (Bet Slip, Favorites) |
| Charts | Recharts |
| i18n | next-intl (DE/EN) |
| Real-time | WebSocket (STOMP) |
| Testing | Playwright E2E |
| Deployment | Prisma Accelerate (Cloud DB) |

### Architektur-Highlights:
- **Full-Stack Next.js:** API Routes + SSR/CSR im selben Projekt
- **Rollenbasiert:** 4 Rollen mit Middleware-geschuetzten Routes
- **Dynamische Quoten:** Automatische Neuberechnung basierend auf Einsatzpool + Margin
- **Audit Trail:** Jede Admin-Aktion wird protokolliert
- **Token-Economy:** Vollstaendiges virtuelles Waehrungssystem mit Transaktions-Log
