# dotBet Nutzeranleitung

## Erste Schritte

### Registrierung

1. Oeffne `http://localhost:3000` im Browser.
2. Klicke auf **Registrieren**.
3. Gib Benutzername, E-Mail und Passwort (mindestens 6 Zeichen) ein.
4. Du erhaelst automatisch **1.000 Start-Tokens** als Guthaben.
5. Nach der Registrierung wirst du direkt eingeloggt.

### Anmeldung

1. Klicke auf **Anmelden**.
2. Gib deinen Benutzernamen und dein Passwort ein.
3. Bei jeder Anmeldung erhaelst du einen **Daily Bonus** (zusaetzliche Tokens), wenn du dich an dem Tag zum ersten Mal einloggst.

---

## Events & Wetten

### Events durchsuchen

1. Klicke auf **Events** in der Navigation.
2. Nutze die Filter:
   - **Statusfilter**: Offen, Geplant, Geschlossen, Ausgewertet
   - **Kategoriefilter**: Filtere nach Sportart oder Thema
   - **Suche**: Freitextsuche nach Event-Titeln
   - **Favoriten** (Stern-Button): Zeige nur deine markierten Events
3. Klicke auf ein Event, um die Details und Maerkte zu sehen.

### Favoriten

- Klicke auf das **Stern-Symbol** bei einem Event, um es als Favorit zu markieren.
- In der Events-Uebersicht kannst du mit dem Stern-Filter nur deine Favoriten anzeigen.
- Favoriten werden lokal gespeichert und bleiben auch nach einem Neustart erhalten.

### Quoten lesen

Auf der Event-Detail-Seite siehst du fuer jeden Markt die Outcomes mit:
- **Aktuelle Quote** (grosse Zahl in Gruen) - je hoeher, desto unwahrscheinlicher das Ergebnis laut Wettverlauf
- **Richtungspfeil**:
  - Gruener Pfeil nach unten = Quote ist gefallen (mehr Leute wetten darauf)
  - Roter Pfeil nach oben = Quote ist gestiegen (weniger Leute wetten darauf)
  - Strich = Keine wesentliche Aenderung
- **Gestakter Betrag** - Wie viele Tokens insgesamt auf dieses Outcome gesetzt wurden
- **Quoten-Chart** - Historischer Verlauf der Quoten als Liniengrafik

Quoten aktualisieren sich in Echtzeit ueber WebSocket. Wenn jemand eine Wette platziert, siehst du die Aenderung sofort.

### Wette platzieren

1. Klicke auf ein Outcome (z.B. "FC Bayern") auf der Event-Detail-Seite.
2. Der **Wettschein** (rechte Seitenleiste) oeffnet sich.
3. Waehle deinen Einsatz:
   - **Schnellwahl-Buttons**: 5, 10, 25, 50 oder Max (dein gesamtes Guthaben)
   - Oder gib manuell einen Betrag ins Eingabefeld ein
4. Der moegliche Gewinn wird automatisch berechnet (Einsatz x Quote).
5. Klicke auf **Wette platzieren**.
6. Dein Token-Guthaben wird sofort aktualisiert.

Du kannst mehrere Outcomes in den Wettschein legen und einzeln oder alle auf einmal platzieren.

**Limits:**
- Minimaler Einsatz: 0.5 Tokens
- Maximaler Einsatz: 100 Tokens
- Du kannst nur auf offene Maerkte wetten.

### Ergebnis & Gewinne

Wenn ein Markt ausgewertet wird:
- **Gewonnen**: Du erhaelst deinen Einsatz x Quote als Tokens gutgeschrieben. Eine Benachrichtigung erscheint automatisch.
- **Verloren**: Dein Einsatz verfaellt. Du erhaelst eine Info-Benachrichtigung.

---

## Profil & Dashboard

Klicke auf dein Profilbild oben rechts und waehle **Profil**.

### Dashboard

Oben siehst du vier Kennzahlen:
- **Tokensaldo** - Dein aktuelles Guthaben
- **Gesamte Wetten** - Wie viele Wetten du platziert hast
- **Gewinnrate** - Prozentsatz deiner gewonnenen Wetten
- **Gesamtgewinn** - Dein Profit ueber alle Wetten

### Meine Wetten

Liste aller deiner Wetten mit:
- Event-Name, Markt, Outcome
- Einsatz, Quote, moeglicher Gewinn
- Status (Offen, Gewonnen, Verloren)

**Filter**: Nutze die Buttons oben, um nach Status zu filtern (Alle / Offen / Gewonnen / Verloren). Die Anzahl pro Status wird neben dem Button angezeigt.

### Analytics

Der Analytics-Tab zeigt dir grafisch aufbereitet:
- **Wett-Verteilung** - Donut-Diagramm deiner Wetten nach Status (Gewonnen/Verloren/Offen)
- **Kennzahlen** - Detaillierte Statistiken (Winrate, Profit, Staked, Won)
- **Saldo-Verlauf** - Dein Token-Guthaben ueber die Zeit als Flaechendiagramm

### Transaktionen

Chronologische Liste aller Token-Bewegungen:
- Wett-Einsaetze (rot)
- Gewinne (gruen)
- Daily Bonus
- Admin-Anpassungen

---

## Einstellungen

Navigiere ueber das Benutzermenu zu **Einstellungen** oder direkt zu `/settings`.

Du kannst aendern:
- **Bio** - Kurze Beschreibung ueber dich (max. 200 Zeichen)
- **Avatar-URL** - Link zu deinem Profilbild
- **Sprache** - Deutsch oder Englisch (wird sofort umgeschaltet)

Klicke auf **Speichern**, um die Aenderungen zu uebernehmen.

---

## Rangliste

Klicke auf **Rangliste** in der Navigation.

Die Rangliste zeigt die besten Tipper sortiert nach Profit:
- **Platz** - Dein Rang (Top 3 mit speziellen Symbolen)
- **Spieler** - Benutzername
- **Gewinn** - Gesamtprofit (gruen = positiv, rot = negativ)
- **Wetten** - Anzahl platzierter Wetten
- **Win %** - Gewinnquote

---

## Dark/Light Mode

Klicke auf das **Sonnen-/Mond-Symbol** im Header, um zwischen Dark Mode und Light Mode zu wechseln. Die Einstellung wird gespeichert.

## Sprache wechseln

Klicke auf **DE** oder **EN** im Header, um die Sprache der Oberflaeche umzuschalten.

---

## Haeufige Fragen

**Wie bekomme ich mehr Tokens?**
- Daily Bonus: Jeden Tag bei der Anmeldung
- Wetten gewinnen
- Start-Tokens bei der Registrierung

**Kann ich echtes Geld einsetzen?**
Nein. dotBet ist eine rein virtuelle Plattform mit Token-Waehrung.

**Was passiert, wenn ein Event abgebrochen wird?**
Alle Wetten werden erstattet. Du erhaelst deinen Einsatz zurueck.

**Warum kann ich nicht wetten?**
- Du bist nicht eingeloggt
- Der Markt ist nicht im Status OPEN
- Dein Guthaben reicht nicht aus
- Dein Einsatz liegt ausserhalb der erlaubten Grenzen
