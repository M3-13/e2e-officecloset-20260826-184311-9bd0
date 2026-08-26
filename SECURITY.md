VERDICT: BLOCKED

## Sicherheitsbericht

Ich habe den vollständigen Produktstand analysiert. Die statischen Scanner `bandit` und `semgrep` wurden laut Vorgabe übersprungen, `pip-audit`/`npm audit` liegen nicht vor; daraus können keine Befunde abgeleitet werden. Es gibt jedoch einen klaren Datenschutzverstoß bei der Konto-Löschung, der ein Blockieren erforderlich macht.

### Befund 1 — Hoch: Konto-Löschung entfernt hochgeladene Bilddateien nicht

**Betroffene Stellen:**  
`backend/app/routers/auth.py` (`_delete_image_files`, `delete_account`)  
`backend/app/routers/wardrobe.py` (`create_item`, `update_item`, `_image_path`, `_item_out`)

**Beschreibung:**  
Beim Anlegen eines Kleidungsstücks wird der gespeicherte Dateiname im Feld `image_url` abgelegt:

```python
item = ClothingItem(
    name=name,
    category=category,
    image_url=filename,
    owner_id=current_user.id,
)
```

Das Modell besitzt zusätzlich ein Feld `image_filename`, das jedoch **nie** gesetzt wird. Die Konto-Löschung ruft `_delete_image_files(items)` auf. Dort wird ausschließlich `item.image_filename` verwendet:

```python
filename = item.image_filename
if not filename:
    continue
```

Da `image_filename` immer `None` ist, löscht die Konto-Löschung **keine** Bilddateien. Persönliche Bilder bleiben nach der Account-Löschung dauerhaft im Upload-Ordner zurück. Das verletzt AC-13 und das Recht auf Löschung.

**Konkrete Lösung:**  
Entweder `image_filename` beim Anlegen/Ändern konsistent füllen:

```python
# create_item
image_filename=filename,

# update_item
item.image_filename = new_filename
```

oder `_delete_image_files` auf das tatsächlich genutzte Feld abstellen:

```python
filename = item.image_filename or item.image_url
```

Empfohlen ist die konsistente Verwendung von `image_filename` im gesamten Code, inklusive `_image_path` und `get_item_image`, um künftige Verwechslungen auszuschließen.

---

### Befund 2 — Mittel: Upload-Größenlimit bei `Transfer-Encoding: chunked` unwirksam

**Betroffene Stellen:**  
`backend/app/routers/wardrobe.py` (`_enforce_request_size`)  
`backend/app/upload.py` (`check_content_length`, `save_image`)  
`backend/app/main.py` (App-Initialisierung)

**Beschreibung:**  
`_enforce_request_size` prüft ausschließlich den `Content-Length`-Header. Ein HTTP-Request mit `Transfer-Encoding: chunked` sendet keinen `Content-Length`-Header. Dann wird der komplette multipart/form-data-Body von FastAPI/Starlette geparst und in einem `SpooledTemporaryFile` gepuffert, **bevor** `save_image` die eigentliche Größenprüfung durchführt. Ein Angreifer kann dadurch große Uploads (z. B. mehrere Gigabyte) senden, die auf dem Server temporär gespeichert werden und die Platte/CPU belasten, bevor die Ablehnung mit 413 erfolgt. Das verletzt AC-08 und ermöglicht einen Ressourcen-DoS.

**Konkrete Lösung:**  
Eine ASGI-Middleware einsetzen, die den eingehenden Request-Body frühzeitig zählt und bei Überschreiten von `max_upload_bytes` sofort 413 sendet. Beispiel in `main.py`:

```python
class BodySizeLimitMiddleware:
    def __init__(self, app, max_body_bytes):
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        total = 0
        sent_413 = False

        async def limited_receive():
            nonlocal total, sent_413
            message = await receive()
            if message["type"] == "http.request":
                total += len(message.get("body", b""))
                if total > self.max_body_bytes and not sent_413:
                    sent_413 = True
                    response = JSONResponse(
                        status_code=413,
                        content={"detail": "Upload exceeds maximum size"},
                    )
                    await response(scope, receive, send)
                    return {"type": "http.request", "body": b"", "more_body": False}
            return message

        await self.app(scope, limited_receive, send)
```

Die Middleware nur auf Upload-Routen oder zumindest auf `POST`/`PUT`-Requests anwenden, damit andere Endpunkte unberührt bleiben.

---

### Befund 3 — Mittel: Rate-Limiter nutzt `request.client.host`; hinter Proxy besteht Denial-of-Service für alle Nutzer

**Betroffene Stelle:**  
`backend/app/ratelimit.py` (`_client_ip`)

**Beschreibung:**  
`_client_ip` liefert `request.client.host`. Wird die Anwendung hinter einem Reverse-Proxy (z. B. Nginx, Caddy) betrieben, ist `request.client.host` für alle Benutzer die IP des Proxys (z. B. `127.0.0.1`). Ein einzelner Client kann dann mit 10 Anfragen das Limit für die **gesamte Plattform** erschöpfen und alle Benutzer für eine Minute aussperren. Das ist ein einfacher Denial-of-Service.

**Konkrete Lösung:**  
Nur vertrauenswürdige Proxy-IPs auswerten und dort `X-Forwarded-For` verwenden:

```python
def _client_ip(request):
    if request.client is None:
        return "unknown"
    client = request.client.host
    forwarded = request.headers.get("x-forwarded-for")
    if client in settings.trusted_proxy_ips and forwarded:
        return forwarded.split(",")[0].strip()
    return client
```

Zusätzlich muss der Reverse-Proxy `X-Forwarded-For` sauber setzen und die Anwendung darf dem Header **nicht** blind vertrauen. Die Liste `trusted_proxy_ips` sollte aus einer Umgebungsvariable geladen werden. Hinweis: Ein verteilter Angreifer kann ein Pro-IP-Limit weiterhin umgehen; das ist akzeptiert, solange der Schutz nicht global ausgehebelt wird.

---

### Befund 4 — Mittel: Ungültiger `Authorization: Bearer`-Header ohne Token führt zu `IndexError`/500

**Betroffene Stelle:**  
`backend/app/security.py` (`get_current_user`)

**Beschreibung:**  
Der Code prüft lediglich `authorization.lower().startswith("bearer ")`. Ein Request mit exakt `Authorization: Bearer` (ohne Token) erfüllt diese Bedingung nicht; stattdessen kommt es erst bei `authorization.split(" ", 1)[1]` zu einem `IndexError`, der vom globalen Exception-Handler zu einem 500-Fehler wird. Eine ungültige Eingabe sollte aber 401 liefern, nicht 500.

**Konkrete Lösung:**

```python
parts = authorization.split(" ", 1)
if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
    raise credentials_exception
token = parts[1].strip()
```

---

### Befund 5 — Niedrig: Fehlende serverseitige Längen-/Zeichenvalidierung für Benutzername und Passwort

**Betroffene Stelle:**  
`backend/app/schemas.py` (`UserCreate`)  
`backend/app/security.py` (`hash_password`)

**Beschreibung:**  
Pydantic akzeptiert beliebig lange oder leere Strings für `username` und `password`. Sehr lange Passwörter (mehr als 72 Bytes) können bei `bcrypt.hashpw` zu einer `ValueError` führen, die als 500 endet. Leere oder extrem schwache Passwörter werden serverseitig akzeptiert. Das ist vor allem eine Robustheits- und Härtungslücke.

**Konkrete Lösung:**

```python
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=72)
```

Zusätzlich in `hash_password` `bcrypt.hashpw` mit `try/except ValueError` absichern und bei Fehler eine 422/400-Antwort auslösen. Die Tests im Produkt verwenden überwiegend Passwörter mit ausreichender Länge (`s3cret-pw`), sodass die Härtung die Produktfunktion nicht bricht.

---

### Befund 6 — Niedrig: Bildinhalte werden nur nach Client-Angabe, nicht nach tatsächlichem Dateiinhalt validiert

**Betroffene Stelle:**  
`backend/app/upload.py` (`save_image`, `image_media_type`)  
`backend/app/routers/wardrobe.py` (`get_item_image`)

**Beschreibung:**  
`save_image` prüft ausschließlich den vom Client gesendeten `Content-Type`. Ein Angreifer kann nicht-bildliche Daten (z. B. HTML) mit `Content-Type: image/jpeg` senden und unter einer `.jpg`-Endung speichern. Da die Auslieferung den Content-Type `image/jpeg` setzt, hält das aktuelle Risiko gering; es fehlt aber eine inhaltliche Prüfung und der Header `X-Content-Type-Options: nosniff`.

**Konkrete Lösung:**  
Zusätzlich die Dateisignatur prüfen:

```python
JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
# bei content_type image/jpeg: header muss mit JPEG_MAGIC beginnen
# bei content_type image/png: header muss mit PNG_MAGIC beginnen
```

Oder mit `Pillow` `Image.open`/`Image.verify` validieren. Beim Ausliefern der Datei `X-Content-Type-Options: nosniff` setzen:

```python
return FileResponse(
    path,
    media_type=image_media_type(item.image_url),
    headers={"X-Content-Type-Options": "nosniff"},
)
```

---

### Befund 7 — Niedrig: Fehlende Security-Header (CSP, X-Frame-Options, nosniff)

**Betroffene Stellen:**  
`backend/app/main.py` (oder Produktions-Reverse-Proxy)  
`frontend/index.html`

**Beschreibung:**  
Die Anwendung setzt keine Content-Security-Policy, kein `X-Content-Type-Options`, kein `X-Frame-Options` und keine `Referrer-Policy`. Das ist kein akuter Exploit, aber fehlende Defense-in-Depth. Da das Produkt laut AC-12 keine Drittanbieter-Ressourcen laden darf, ist eine strikte CSP gut umsetzbar.

**Konkrete Lösung:**  
In einer FastAPI-Middleware oder im Produktions-Server setzen:

```text
Content-Security-Policy: default-src 'self'; img-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```

Dabei muss `img-src 'self' blob:` enthalten sein, weil das Frontend Bilder über `URL.createObjectURL` als `blob:`-URLs darstellt. Für die lokale Vite-Entwicklung ist die CSP nur im Produktions-Build zu aktivieren, damit Dev-HMR nicht blockiert wird. Die Anwendung selbst nutzt ausschließlich lokale Ressourcen und bleibt unter dieser CSP funktionsfähig.

---

### Abhängigkeitsprüfung / Scanner-Lücken

Die statischen Scanner `bandit` und `semgrep` wurden übersprungen; `pip-audit`/`npm audit` liegen nicht vor. Es ist daher **nicht möglich**, eine abschließende Beurteilung der Drittabhängigkeiten (`fastapi`, `sqlalchemy`, `bcrypt`, `python-jose`, React/Vite) abzugeben. Aus dem sichtbaren Code ergeben sich keine unmittelbaren Hinweise auf bekannte ausgenutzte CVEs, aber die fehlenden Befunde sollten im CI-Prozess ergänzt werden, bevor ein Release erfolgt.