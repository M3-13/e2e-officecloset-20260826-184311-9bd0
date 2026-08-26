import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import App from "../App";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import AccountPage from "../pages/AccountPage";

function tokenFor(username: string): string {
  const payload = btoa(JSON.stringify({ sub: username }))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `header.${payload}.signature`;
}

type MockResponse = {
  status: number;
  ok: boolean;
  statusText: string;
  json: () => Promise<unknown>;
};

function jsonResponse(status: number, body: unknown): MockResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => body,
  };
}

function stubFetch(handler: (url: string, init?: RequestInit) => MockResponse) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url, init) as unknown as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/wardrobe" element={<div>GARDEROBE</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

function renderRegister() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/wardrobe" element={<div>GARDEROBE</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

function UnauthorizedTrigger() {
  const { token } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? "none"}</span>
      <button type="button" onClick={() => void fetch("/api/wardrobe/items")}>
        trigger
      </button>
    </div>
  );
}

describe("Login und Registrierung", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("meldet einen Benutzer an und leitet zur Garderobe weiter", async () => {
    const fetchMock = stubFetch((url) => {
      if (url.endsWith("/api/auth/login")) {
        return jsonResponse(200, {
          access_token: tokenFor("testuser"),
          token_type: "bearer",
        });
      }
      return jsonResponse(404, { detail: "nicht gefunden" });
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText("Benutzername"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "geheim123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() => expect(screen.getByText("GARDEROBE")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBeTruthy();
  });

  it("zeigt bei falschen Anmeldedaten eine verständliche Fehlermeldung", async () => {
    stubFetch((url) => {
      if (url.endsWith("/api/auth/login")) {
        return jsonResponse(401, { detail: "ungültige Anmeldedaten" });
      }
      return jsonResponse(404, { detail: "nicht gefunden" });
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText("Benutzername"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "falsch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() =>
      expect(
        screen.getByText("Benutzername oder Passwort ist falsch.")
      ).toBeTruthy()
    );
  });

  it("registriert einen neuen Benutzer und leitet zur Garderobe weiter", async () => {
    const fetchMock = stubFetch((url) => {
      if (url.endsWith("/api/auth/register")) {
        return jsonResponse(201, { id: 1, username: "neuling" });
      }
      if (url.endsWith("/api/auth/login")) {
        return jsonResponse(200, {
          access_token: tokenFor("neuling"),
          token_type: "bearer",
        });
      }
      return jsonResponse(404, { detail: "nicht gefunden" });
    });

    renderRegister();

    fireEvent.change(screen.getByLabelText("Benutzername"), {
      target: { value: "neuling" },
    });
    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "geheim123" },
    });
    fireEvent.change(screen.getByLabelText("Passwort wiederholen"), {
      target: { value: "geheim123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrieren" }));

    await waitFor(() => expect(screen.getByText("GARDEROBE")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBeTruthy();
  });
});

describe("Validierung", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("zeigt eine Meldung bei leerem Benutzernamen in der Anmeldung", async () => {
    const fetchMock = stubFetch(() => jsonResponse(404, { detail: "nicht gefunden" }));

    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() =>
      expect(
        screen.getByText("Bitte gib deinen Benutzernamen ein.")
      ).toBeTruthy()
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("zeigt eine Meldung bei nicht übereinstimmenden Passwörtern", async () => {
    const fetchMock = stubFetch(() => jsonResponse(404, { detail: "nicht gefunden" }));

    renderRegister();

    fireEvent.change(screen.getByLabelText("Benutzername"), {
      target: { value: "neuling" },
    });
    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "geheim123" },
    });
    fireEvent.change(screen.getByLabelText("Passwort wiederholen"), {
      target: { value: "anders456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrieren" }));

    await waitFor(() =>
      expect(
        screen.getByText("Die Passwörter stimmen nicht überein.")
      ).toBeTruthy()
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Logout und Guard", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("leitet ohne Token von einer geschützten Route zur Anmeldung um", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByRole("heading", { name: "Anmelden" })).toBeTruthy();
  });

  it("zeigt die Garderobe mit Token und führt nach dem Abmelden zurück zur Anmeldung", async () => {
    localStorage.setItem("token", tokenFor("testuser"));

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Garderobe" })).toBeTruthy()
    );

    fireEvent.click(screen.getByRole("button", { name: /Abmelden/ }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Anmelden" })).toBeTruthy()
    );
    expect(localStorage.getItem("token")).toBeNull();
  });
});

describe("401-Abfangen und Konto-Löschung", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("löscht die Sitzung bei einer 401-Antwort", async () => {
    localStorage.setItem("token", tokenFor("testuser"));
    stubFetch(() => jsonResponse(401, { detail: "ungültige Sitzung" }));

    render(
      <AuthProvider>
        <UnauthorizedTrigger />
      </AuthProvider>
    );

    expect(screen.getByTestId("token").textContent).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "trigger" }));

    await waitFor(() =>
      expect(screen.getByTestId("token").textContent).toBe("none")
    );
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("löscht das Konto und meldet danach ab", async () => {
    localStorage.setItem("token", tokenFor("testuser"));
    localStorage.setItem("user", JSON.stringify({ username: "testuser" }));

    const fetchMock = stubFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(204, undefined);
      }
      return jsonResponse(404, { detail: "nicht gefunden" });
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/account"]}>
          <Routes>
            <Route path="/account" element={<AccountPage />} />
            <Route path="/login" element={<div>LOGIN</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Konto löschen" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Ja, endgültig löschen" })
    );

    await waitFor(() => expect(screen.getByText("LOGIN")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBeNull();
  });
});
