VERDICT: BUGS_FOUND

Die Backend-Tests sind grün (50 passed), der API-Server startet laut RUN.json und `/api/health` antwortet mit HTTP 200. Der Browser-/Playwright-Lauf zeigt jedoch einen reproduzierbaren Fehler: Registrierung und Anmeldung werden mit HTTP 429 abgelehnt, sodass der primäre Benutzerfluss im E2E-Smoke scheitert und ein Auth-Guard-Test ebenfalls fehlschlägt.

**Title:** Rate-Limit blockiert Registrierung/Anmeldung (HTTP 429) – primärer Benutzerfluss nicht nutzbar

**Symptom:**  
Bei der browserbasierten E2E-Prüfung kann sich kein neuer Benutzer registrieren und anmelden. Die API antwortet auf `POST /api/auth/register` und `POST /api/auth/login` jeweils mit `429 Too Many Requests`. Dadurch wird keine Sitzung etabliert (`session after sign-up + sign-in: NONE`) und der Smoke-Test meldet „the primary user flow does not work“. Der Auth-Test schlägt in der Folge ebenfalls fehl, weil die erwartete Anmeldeseite nicht erscheint.

**Repro:**  
Playwright-Lauf `e2e\_smoke.spec.cjs` und `e2e\auth.spec.cjs` gegen das gestartete Backend (`api` auf Port 8000); nach vorherigen Requests innerhalb desselben Minutenfensters liefern Registrierung und Login 429.

**Evidence:**  
- `[account-probe] POST /api/auth/register -> 429`
- `[account-probe] POST /api/auth/login -> 429`
- `[account-probe] session after sign-up + sign-in: NONE`
- Fehlermeldung: „the primary user flow does not work: signing up and signing in produced no session, and the server answered: POST /api/auth/register -> 429 POST /api/auth/login -> 429"
- Folgefehler: `expect(locator).toBeVisible() failed … Locator: getByRole('heading', { name: 'Anmelden' })`

**Suspected file(s):**  
`backend/app/ratelimit.py` — das In-Memory-Rate-Limit pro IP zählt alle Anfragen des E2E-Laufs zusammen und greift nach 10 Requests/Minute. Beide betroffenen Endpunkte teilen sich diese Dependency, daher antworten sie identisch.

**Severity:** high

Known open decisions:
- MR !14 — bewusst offen gelassen; wird nicht als Bug gewertet.

---

_Office note: the findings above name only merge requests left open for the Architect (!14). They are recorded as open decisions, not as runtime defects — see the demo._