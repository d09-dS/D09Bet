# dotBet Nutzeranleitung - Administrator

## Anmeldung

1. Oeffne `http://localhost:3000` im Browser.
2. Klicke auf **Anmelden** und gib deine Admin-Zugangsdaten ein.
   - Entwicklung: `admin` / `dotbet_dev`
3. Nach der Anmeldung erscheint im Benutzermenu der Punkt **Admin**.

---

## Admin-Bereich

Klicke auf dein Profilbild oben rechts und waehle **Admin**, oder navigiere direkt zu `/admin`.

Der Admin-Bereich hat vier Tabs:

### 1. Events

Hier verwaltest du alle Wett-Events der Plattform.

**Event erstellen:**
1. Klicke auf **Neues Event**.
2. Fulle Titel (DE), optional Title (EN), Beschreibung und Startzeit aus.
3. Klicke auf **Erstellen**.
4. Das Event wird im Status **DRAFT** angelegt.

**Maerkte hinzufuegen:**
1. Klappe ein Event auf, indem du darauf klickst.
2. Im Bereich **Markt hinzufuegen** gibst du ein:
   - Markt-Name (z.B. "Gewinner")
   - Typ (WINNER, OVER/UNDER, YES/NO, CUSTOM)
   - Margin-Faktor (Standard: 0.95)
   - Mindestens 2 Outcomes mit Namen und Start-Quote
3. Klicke auf **Markt speichern**.

**Event-Status aendern:**

Events durchlaufen folgenden Lebenszyklus:

```
DRAFT --> SCHEDULED --> OPEN --> CLOSED --> SETTLED
                \         \         \
                 --> CANCELED  (jederzeit bis SETTLED)
```

Klicke auf die entsprechenden Status-Buttons neben dem Event:
- **SCHEDULED**: Event ist geplant, noch nicht sichtbar fuer Wetten.
- **OPEN**: Wetten koennen platziert werden.
- **CLOSED**: Keine neuen Wetten mehr moeglich.
- **SETTLED**: Erst nach Markt-Auswertung sinnvoll.
- **CANCELED**: Bricht das Event ab, Wetten werden erstattet.

**Markt auswerten (Settlement):**
1. Oeffne ein Event im Status CLOSED oder OPEN.
2. Bei jedem Markt siehst du die Outcomes.
3. Klicke bei dem Gewinner-Outcome auf **Gewinner**.
4. Alle Wetten auf dieses Outcome werden als WON markiert, Gewinne werden automatisch gutgeschrieben.
5. Alle anderen Wetten werden als LOST markiert.
6. Alle betroffenen Nutzer erhalten eine Echtzeit-Benachrichtigung ueber WebSocket.

### 2. Benutzer

Hier siehst du alle registrierten Nutzer.

**Rolle aendern:**
- Klicke auf die Rollen-Auswahl neben einem Benutzer.
- Verfuegbare Rollen: USER, MODERATOR, ADMIN.
- Aenderungen werden sofort wirksam und im Audit-Log protokolliert.

**Tokens anpassen:**
1. Klicke auf das Token-Symbol neben einem Benutzer.
2. Gib den Betrag ein (positiv = gutschreiben, negativ = abziehen).
3. Gib einen Grund an (z.B. "Bonus", "Korrektur").
4. Klicke auf **Anpassen**.

### 3. Einstellungen

Systemweite Konfiguration der Plattform:

| Einstellung | Beschreibung | Standard |
|---|---|---|
| `initial_tokens` | Start-Tokens bei Registrierung | 10 |
| `daily_bonus_amount` | Taeglicher Bonus | 2 |
| `daily_bonus_enabled` | Bonus aktiv? | true |
| `min_bet_stake` | Minimaler Einsatz | 0.5 |
| `max_bet_stake` | Maximaler Einsatz | 100 |
| `odds_min` | Minimale Quote | 1.01 |
| `odds_max` | Maximale Quote | 50.0 |

Aendere den Wert und klicke auf **Speichern**.

### 4. Audit-Log

Zeigt alle Admin-Aktionen chronologisch:
- Wer hat was gemacht?
- Welches Objekt war betroffen?
- Zeitstempel und Details.

Aktionen die protokolliert werden:
- Rollenaenderungen
- Token-Anpassungen
- Markt-Auswertungen
- Einstellungsaenderungen

---

## Weitere Funktionen

Als Admin hast du zusaetzlich alle Funktionen eines normalen Nutzers:

- **Wetten platzieren** auf offene Events
- **Profil & Analytics** einsehen (Dashboard, Wett-Historie, Analytics-Charts)
- **Einstellungen** (Bio, Avatar, Sprache) unter `/settings`
- **Rangliste** einsehen
- **Favoriten** markieren
- **Sprache** (DE/EN) und **Theme** (Dark/Light) im Header umschalten

---

## Entwicklung: Test-Zugaenge

| Benutzer | Passwort | Rolle |
|---|---|---|
| admin | dotbet_dev | ADMIN |
| moderator | dotbet_dev | MODERATOR |
| user | dotbet_dev | USER |
