# dotBet Nutzeranleitung - Moderator

## Anmeldung

1. Oeffne `http://localhost:3000` im Browser.
2. Klicke auf **Anmelden** und gib deine Moderator-Zugangsdaten ein.
   - Entwicklung: `moderator` / `dotbet_dev`
3. Nach der Anmeldung erscheint im Benutzermenu der Punkt **Admin**.

---

## Deine Aufgaben als Moderator

Als Moderator bist du fuer die Verwaltung von Events und Maerkten zustaendig. Du kannst Events erstellen, deren Status steuern und Maerkte auswerten.

Du hast **keinen** Zugriff auf:
- Benutzerverwaltung (Rollen aendern, Tokens anpassen)
- Systemeinstellungen
- Audit-Log

---

## Admin-Bereich (Tab: Events)

Navigiere ueber das Benutzermenu zu **Admin**. Du siehst nur den Tab **Events**.

### Event erstellen

1. Klicke auf **Neues Event**.
2. Fuelle die Felder aus:
   - **Titel (DE)** - Pflichtfeld, z.B. "FC Bayern vs. BVB"
   - **Title (EN)** - Optional, fuer englischsprachige Nutzer
   - **Beschreibung (DE/EN)** - Optional
   - **Startzeit** - Wann das Event stattfindet
3. Klicke auf **Erstellen**.

Das Event wird im Status DRAFT angelegt und ist noch nicht fuer Wetten offen.

### Maerkte anlegen

Jedes Event braucht mindestens einen Markt mit Outcomes, damit Nutzer wetten koennen.

1. Klappe das Event auf (Klick auf die Zeile).
2. Im Bereich **Markt hinzufuegen**:
   - **Name**: z.B. "Endergebnis" oder "Torschuetze"
   - **Typ**: WINNER (Standard), OVER/UNDER, YES/NO, CUSTOM
   - **Margin-Faktor**: Hausvorteil (0.95 = 5% Marge)
   - **Outcomes**: Mindestens 2 Moeglichkeiten mit Start-Quoten
3. Klicke auf **Markt speichern**.

Beispiel:
```
Markt: "Gewinner"
  Outcome 1: "FC Bayern"  - Quote 1.80
  Outcome 2: "Unentschieden" - Quote 3.50
  Outcome 3: "BVB"        - Quote 4.20
```

Du kannst mehrere Maerkte pro Event anlegen (z.B. "Gewinner", "Ueber/Unter 2.5 Tore").

### Event-Status verwalten

Der Lebenszyklus eines Events:

| Status | Bedeutung | Naechste Schritte |
|---|---|---|
| **DRAFT** | Entwurf, nicht sichtbar | SCHEDULED oder OPEN |
| **SCHEDULED** | Geplant, sichtbar aber keine Wetten | OPEN |
| **OPEN** | Wetten moeglich | CLOSED wenn das Event beginnt |
| **CLOSED** | Keine neuen Wetten | SETTLED nach Auswertung |
| **SETTLED** | Ausgewertet, Gewinne verteilt | Endstatus |
| **CANCELED** | Abgebrochen | Endstatus |

Klicke auf die Status-Buttons neben dem Event, um den Uebergang auszuloesen.

**Typischer Ablauf:**
1. Event erstellen (DRAFT)
2. Maerkte und Outcomes anlegen
3. Status auf OPEN setzen (Wetten werden angenommen)
4. Wenn das reale Event beginnt: Status auf CLOSED
5. Nach Ergebnis: Maerkte auswerten (Settlement)
6. Status auf SETTLED setzen

### Maerkte auswerten (Settlement)

Das ist die wichtigste Moderator-Aufgabe: Nach einem Event das Ergebnis eintragen.

1. Oeffne das Event (Klick).
2. Finde den Markt, der ausgewertet werden soll.
3. Bei den Outcomes siehst du fuer jeden einen **Gewinner**-Button.
4. Klicke auf den Button des gewinnenden Outcomes.
5. Das System:
   - Markiert den Markt als SETTLED
   - Setzt Wetten auf den Gewinner auf WON und schreibt Gewinne gut
   - Setzt alle anderen Wetten auf LOST
   - Benachrichtigt betroffene Nutzer in Echtzeit

**Achtung:** Die Auswertung kann nicht rueckgaengig gemacht werden. Pruefe das Ergebnis sorgfaeltig.

---

## Weitere Funktionen

Als Moderator hast du alle Funktionen eines normalen Nutzers:

- **Wetten platzieren** auf offene Events
- **Profil** mit Dashboard, Wett-Historie und Analytics
- **Einstellungen** (Bio, Avatar, Sprache) unter `/settings`
- **Rangliste** einsehen
- **Favoriten** markieren (Stern-Symbol bei Events)
- **Sprache** (DE/EN) und **Theme** (Dark/Light) im Header umschalten

---

## Tipps

- Erstelle Events mit aussagekraeftigen Titeln und Beschreibungen.
- Setze Start-Quoten realistisch - das System passt sie dynamisch an.
- Werte Maerkte zeitnah aus, damit Nutzer ihre Gewinne erhalten.
- Du kannst Events jederzeit auf CANCELED setzen, falls noetig (Wetten werden erstattet).
