VERDICT: BLOCKED

## Konformitätsbericht: Glamouröser Kleiderschrank-Manager

### Prüfumfang
Beurteilt wird der zusammengeführte Produktstand eines Full-Stack-Webprojekts (FastAPI, SQLite, React/Vite) mit öffentlich erreichbarer Benutzeroberfläche. Geprüft wurden die tatsächlich im Code sichtbaren Pflichten nach DSGVO, EU Cyber Resilience Act, EU AI Act, marktbezogene Pflichttexte sowie Barrierefreiheit.

---

## 1. DSGVO

### Befund 1 — KRITISCH: Account-Löschung entfernt hochgeladene Bilddateien nicht
- **Wo:** `backend/app/routers/wardrobe.py` Zeilen im Bereich `create_item` / `update_item`; `backend/app/routers/auth.py` Funktion `_delete_image_files`.
- **Sachverhalt:** Beim Anlegen eines Kleidungsstücks wird der gespeicherte Dateiname ausschließlich in `ClothingItem.image_url` geschrieben (`image_url=filename`). Das Modellfeld `image_filename` bleibt `None`. Bei der Account-Löschung iteriert `_delete_image_files` jedoch über `item.image_filename` und löscht daher nichts. Die Bilddateien bleiben nach der vom Nutzer veranlassten Account-Löschung dauerhaft auf dem Server. Dies verletzt das Recht auf Löschung nach Art. 17 DSGVO und die Projektvorgabe AC-13 ausdrücklich. Der bestehende Test `test_delete_account_removes_data` verdeckt den Fehler, weil er `image_filename` manuell setzt.
- **Abhilfe:**
  - In `backend/app/routers/wardrobe.py` bei `create_item` ergänzen: `image_filename=filename`.
  - Bei `update_item` ergänzen: `item.image_filename = new_filename`.
  - In `backend/app/routers/auth.py` `_delete_image_files` sicherheitshalber auf `item.image_filename or item.image_url` umstellen oder einheitlich `image_filename` verwenden.
  - Test anpassen, sodass er den realen Upload-Pfad nutzt und den tatsächlichen Dateinamen prüft.

### Befund 2 — MITTEL: Backend erlaubt leere Benutzernamen und leere Passwörter
- **Wo:** `backend/app/schemas.py`, Klasse `UserCreate`.
- **Sachverhalt:** `username: str` und `password: str` erlauben leere Zeichenketten. Registrierung und Login können mit leeren Daten durchlaufen. Das widerspricht dem Grundsatz der Datenminimierung und der sicheren Verarbeitung (Art. 5 Abs. 1 lit. f, Art. 32 DSGVO) sowie der Vorgabe AC-05. Die Frontend-Validierung fängt dies zwar ab, aber das Backend darf sich darauf nicht verlassen.
- **Abhilfe:**
  - In `UserCreate` ergänzen:
    ```python
    from pydantic import Field, field_validator
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=200)
    ```
  - Optional `@field_validator("username")` für ein erlaubtes Zeichenmuster.
  - Gleiche Prüfung in die Tests aufnehmen.

### Befund 3 — MITTEL: Datenschutzerklärung nennt keine Rechtsgrundlagen und keine Speicherdauer
- **Wo:** `frontend/src/pages/DatenschutzPage.tsx`.
- **Sachverhalt:** Die Datenschutzerklärung beschreibt zwar Datenarten, Bild-Uploads, Tokens und Account-Löschung, nennt aber weder die Rechtsgrundlagen (z. B. Art. 6 Abs. 1 lit. b DSGVO für Vertragserfüllung) noch die konkrete Speicherdauer (z. B. „bis zur Löschung des Kontos“) noch das Recht auf Beschwerde bei einer Aufsichtsbehörde. Für eine öffentlich verfügbare Webanwendung ist das unvollständig (Art. 13 DSGVO).
- **Abhilfe:**
  - In `DatenschutzPage.tsx` einen Abschnitt „Rechtsgrundlagen und Speicherdauer“ ergänzen, der mindestens Art. 6 Abs. 1 lit. b DSGVO und die Speicherdauer bis zur Löschung des Kontos nennt.
  - Ergänzen: „Beschwerderecht bei der zuständigen Aufsichtsbehörde“.
  - Empfänger: ausdrücklich „keine Übermittlung an Dritte“ aufführen.

### Befund 4 — NIEDRIG: JWT im `localStorage` gespeichert ohne Content-Security-Policy
- **Wo:** `frontend/src/auth/AuthContext.tsx`, `frontend/src/api.ts`.
- **Sachverhalt:** Das JWT liegt im `localStorage` und ist dadurch bei XSS angreifbar. Aktuell ist keine CSP gesetzt, die das Risiko begrenzen würde. Ein rechtswidriger Zustand liegt nicht zwingend vor, aber das Sicherheitsniveau ist verbesserungswürdig.
- **Abhilfe:**
  - Eine CSP einführen (siehe CRA-Befund 1), die Skriptquellen auf `'self'` beschränkt.
  - Alternativ Token in einem HttpOnly-Cookie ablegen, sofern das Architekturziel das zulässt.

---

## 2. EU Cyber Resilience Act (CRA)

### Befund 1 — MITTEL: Keine Security-Header / Content-Security-Policy
- **Wo:** `backend/app/main.py`.
- **Sachverhalt:** Die API liefert keine CSP, `X-Content-Type-Options`, `Referrer-Policy` oder `X-Frame-Options`. Die React-App nutzt Inline-Styles und erzeugt Blob-URLs für Bilder. Eine CSP muss so gesetzt werden, dass diese legitimen Funktionen weiterhin funktionieren.
- **Abhilfe:**
  - In `backend/app/main.py` eine Middleware ergänzen, die mindestens setzt:
    ```http
    Content-Security-Policy: default-src 'self'; img-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'
    X-Content-Type-Options: nosniff
    Referrer-Policy: same-origin
    X-Frame-Options: DENY
    ```
  - `style-src 'unsafe-inline'` ist erforderlich, weil die Anwendung inline styles nutzt; ohne diese Anpassung bricht die Oberfläche. `img-src blob:` ist erforderlich, weil Vorschaubilder als Blob-URLs angezeigt werden.

### Befund 2 — MITTEL: Kein SBOM / dokumentiertes Schwachstellen- und Update-Verfahren sichtbar
- **Wo:** Repository-Stand insgesamt, `backend/requirements.txt`, `frontend/package.json`.
- **Sachverhalt:** Der CRA verlangt für Produkte mit digitalen Elementen unter anderem die Bereitstellung einer SBOM und ein dokumentiertes Verfahren zur Behebung von Schwachstellen und zur Bereitstellung von Sicherheitsupdates. Beides ist im sichtbaren Stand nicht vorhanden.
- **Abhilfe:**
  - SBOM erzeugen und einchecken (z. B. `cyclonedx-bom` für Python, `npm sbom`/`cyclonedx-npm` für das Frontend) und im Deployment bereitstellen.
  - In `README.md` einen Abschnitt „Security-Advisories und Updates“ ergänzen: Patch-Prozess, Update-Intervall, Kontakt für Sicherheitsmeldungen.
  - Abhängigkeiten mit exakten Versionen pinnen, sofern nicht bereits geschehen, und regelmäßige Vulnerability-Scans dokumentieren.

### Befund 3 — NIEDRIG: MIME-Typ-Prüfung verlässt sich auf den Client
- **Wo:** `backend/app/upload.py`, Funktion `save_image`.
- **Sachverhalt:** `upload.content_type` wird akzeptiert und nicht gegen Dateiinhalt (Magic Bytes) verifiziert. Da die Datei später als `image/jpeg`/`image/png` ausgeliefert wird, ist das Risiko begrenzt, aber nicht ausgeschlossen. Eine robuste Inhaltsprüfung entspricht dem Grundsatz „security by design“ des CRA.
- **Abhilfe:**
  - In `save_image` die ersten Bytes prüfen (JPEG: `0xFF 0xD8`, PNG: `0x89 0x50 0x4E 0x47`).
  - Abweichende Inhalte mit 415 ablehnen.

---

## 3. EU AI Act

Kein KI-basiertes Feature im Produkt sichtbar. Der Prüfbereich ist nicht anwendbar.

---

## 4. Mandatory texts / UI

### Befund 1 — HOCH: Impressum enthält Platzhalterangaben
- **Wo:** `frontend/src/pages/ImpressumPage.tsx`.
- **Sachverhalt:** „Beispielstraße 1“, „Max Mustermann“ und die `.example`-E-Mail sind offensichtliche Platzhalter und erfüllen keine ladungsfähige Anbieterkennzeichnung nach § 5 DDG. Für eine Marktfreigabe ist das nicht geeignet.
- **Abhilfe:**
  - In `ImpressumPage.tsx` echte Betreiberdaten einsetzen: Firma, Anschrift, Vertretungsorgan, Telefon und E-Mail. Die E-Mail-Domain darf keine `.example`-Domain sein.

### Befund 2 — MITTEL: Datenschutzerklärung unvollständig
- **Wo:** `frontend/src/pages/DatenschutzPage.tsx`.
- **Sachverhalt:** Wie unter DSGVO-Befund 3 beschrieben; fehlende Rechtsgrundlage, Speicherdauer und Beschwerdehinweis.
- **Abhilfe:** Dort ergänzen.

### Befund 3 — KEIN BLOCKER: Kein Cookie-Consent-Banner
- **Sachverhalt:** Die App setzt keine Cookies und lädt keine Drittanbieter-Ressourcen. Ein Consent-Banner ist daher nicht erforderlich. Sollten später Tracking, Analytics oder externe Schriften eingebunden werden, muss vorher eine Einwilligung eingeholt werden.

---

## 5. Barrierefreiheit (WCAG / BITV / EAA)

### Befund 1 — MITTEL: Modals ohne Fokus-Management und ESC-Schließung
- **Wo:** `frontend/src/components/OutfitList.tsx`, `frontend/src/pages/WardrobePage.tsx`.
- **Sachverhalt:** Die Dialoge haben `role="dialog"` und `aria-modal="true"`, aber es fehlen Fokus-Trap, Rückführung des Fokus auf den auslösenden Button nach dem Schließen und eine Tastaturbedienung zum Schließen (ESC). Das schließt Tastaturnutzer teilweise aus.
- **Abhilfe:**
  - In beiden Dialog-Komponenten einen Fokus-Trap implementieren und `keydown`/`Escape` behandeln.
  - Beim Öffnen den ersten Fokuspunkt setzen; beim Schließen den Fokus auf den auslösenden Button zurückgeben.

### Befund 2 — NIEDRIG: Kein Skip-Link zur Hauptnavigation
- **Wo:** `frontend/src/App.tsx`.
- **Sachverhalt:** Es gibt keinen „Zum Inhalt springen“-Link. Das erschwert Tastaturnutzern das Überspringen der Navigation.
- **Abhilfe:**
  - In `App.tsx` am Anfang des Layouts einen visuell versteckten Skip-Link einfügen:
    ```tsx
    <a href="#main-content" className="skip-link">Zum Inhalt springen</a>
    ```
    und `<main id="main-content" className="content">` setzen.

### Befund 3 — NIEDRIG: Farbkontraste nicht gegen WCAG geprüft
- **Wo:** `frontend/src/styles/theme.css`.
- **Sachverhalt:** Die Farbwerte (`--color-muted`, `--color-danger`, `--color-accent` auf dunklem Hintergrund) wurden nicht nachweislich gegen WCAG-AA geprüft.
- **Abhilfe:**
  - Kontrastprüfung durchführen; bei unzureichendem Kontrast die Variablen anpassen. Besonders `--color-muted: #9a8f82` auf `--color-bg: #0f0c09` ist kritisch zu prüfen.

---

## Zusammenfassung

Das Produkt erfüllt viele wesentliche Sicherheitsanforderungen: Passwort-Hashing mit bcrypt, JWT-Betrieb mit konfigurierbarem Secret, Eigentumsprüfung bei allen ID-basierten Operationen, Upload-Größenbegrenzung, MIME-Filter, Rate-Limiting, CORS nur für eine konfigurierte Origin sowie Impressum und Datenschutz mit Verlinkung.

**Blockierender Mangel:** Die Account-Löschung entfernt hochgeladene Bilddateien wegen eines Datenmodellierungsfehlers nicht. Dies verletzt Art. 17 DSGVO und die Projektanforderung AC-13 eindeutig. Bis dieser Pfad korrigiert und getestet ist, darf das Produkt nicht an Kunden gehen.