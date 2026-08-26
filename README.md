# Glamouröser Kleiderschrank-Manager

Ein Full-Stack-Webprojekt im Hollywood-Stil: Benutzer registrieren sich, verwalten
ihre Garderobe mit Kleidungsstücken inklusive Bildern und Kategorien, durchstöbern sie
und kombinieren Einzelteile im Outfit-Creator zu gespeicherten Outfits – alles in
eleganter Red-Carpet-Optik.

## Tech-Stack

- **Backend**: Python 3.13, FastAPI, SQLAlchemy (ORM), SQLite, JWT (python-jose), bcrypt
- **Frontend**: React (Vite), TypeScript
- **Auth**: JWT über `Authorization: Bearer <token>`
- **Bildspeicherung**: lokaler Upload-Ordner

## Installation

**Backend** (aus dem Repo-Wurzelverzeichnis):

```bash
cd backend
py -m pip install -r requirements.txt
```

**Frontend** (aus dem Repo-Wurzelverzeichnis):

```bash
cd frontend
npm install
```

## Start (Entwicklung)

**Backend** (Port 8000):

```powershell
cd backend
$env:JWT_SECRET = py -c "import secrets; print(secrets.token_hex(32))"
py -m uvicorn app.main:app --port 8000
```

**Frontend** (Port 5173, Vite-Dev-Server):

```bash
cd frontend
npm run dev
```

Der Backend-Start läuft alternativ über den in `RUN.json` deklarierten Startvertrag
(der Test-Runner und die CI starten das Produkt genau darüber).

## Konfiguration

Alle Werte werden beim Start aus der Umgebung gelesen (siehe `RUN.json`). Folgende
Variablen werden unterstützt:

| Variable         | Bedeutung                                          | Default                 |
| ---------------- | -------------------------------------------------- | ----------------------- |
| `JWT_SECRET`     | Geheimnis zum Signieren der JWTs (kein Literal!)   | – (per `generate`)      |
| `CORS_ORIGIN`    | Erlaubte Frontend-Origin für CORS                  | `http://localhost:5173` |
| `UPLOAD_MAX_MB`  | Maximale Upload-Größe in MB                        | `5`                     |
| `UPLOAD_DIR`     | Zielordner für hochgeladene Bilder                 | `./uploads`             |
| `DATABASE_URL`   | SQLAlchemy-Verbindungs-URL                         | `sqlite:///./wardrobe.db` |

`JWT_SECRET` wird niemals fest im Repository abgelegt: In `RUN.json` ist es als
`generate` (hex, 32 Bytes) deklariert und wird pro Lauf neu erzeugt. Für einen
manuellen Start generiert der Befehl oben (`secrets.token_hex(32)`) einen Wert.

## API

Alle Endpunkte liegen unter `/api`. Fehlerantworten haben immer die Form
`{"detail": "<text>"}`.

| Methode | Pfad                              | Beschreibung                                  |
| ------- | --------------------------------- | --------------------------------------------- |
| GET     | `/api/health`                     | Health-Check → `200 {"status":"ok"}`          |
| POST    | `/api/auth/register`              | Registrierung `{username,password}` → `201 {id,username}` |
| POST    | `/api/auth/login`                 | Anmeldung `{username,password}` → `200 {access_token,token_type}` |
| DELETE  | `/api/users/me`                   | Account inkl. Garderobe/Outfits/Bilder löschen → `204` |
| GET     | `/api/wardrobe/categories`        | Kategorien → `200 {"categories":[...]}`       |
| GET     | `/api/wardrobe/items`             | Garderobe auflisten (optional `?category=`)   |
| POST    | `/api/wardrobe/items`             | Kleidungsstück anlegen (multipart `name,category,image?`) |
| PUT     | `/api/wardrobe/items/{id}`        | Kleidungsstück ändern (multipart)             |
| DELETE  | `/api/wardrobe/items/{id}`        | Kleidungsstück löschen → `204`                |
| GET     | `/api/wardrobe/items/{id}/image`  | Bild laden (mit Token)                        |
| POST    | `/api/outfits`                    | Outfit anlegen `{name,item_ids}`              |
| GET     | `/api/outfits`                    | Outfits auflisten                             |
| GET     | `/api/outfits/{id}`               | Einzelnes Outfit                              |
| DELETE  | `/api/outfits/{id}`               | Outfit löschen → `204`                        |

### Beispiele

Registrieren und anmelden:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "marilyn", "password": "geheim"}'
# → {"id": 1, "username": "marilyn"}

curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "marilyn", "password": "geheim"}'
# → {"access_token": "<jwt>", "token_type": "bearer"}
```

## Features

- Registrierung, Anmeldung und Account-Löschung (JWT-Auth)
- Garderobe mit Kleidungsstücken (Name, Kategorie, Bild) und Kategorie-Filter
- Outfit-Creator zum Kombinieren und Speichern von Outfits
- Eigentumsprüfung bei allen ID-basierten Zugriffen
- Upload-Größenbegrenzung und MIME-Validierung (image/jpeg, image/png)
