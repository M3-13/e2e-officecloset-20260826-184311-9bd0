import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import WardrobePage from "../pages/WardrobePage";

interface TestItem {
  id: number;
  name: string;
  category: string;
  image_url: string | null;
  created_at: string;
}

const CATEGORIES = ["oberteile", "unterteile", "schuhe", "accessoires"];

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeItem(id: number, name: string, category: string): TestItem {
  return {
    id,
    name,
    category,
    image_url: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

type FetchHandler = (
  url: string,
  init: RequestInit,
  items: TestItem[]
) => Promise<Response>;

function installFetch(
  items: TestItem[],
  onRequest?: (url: string, init: RequestInit) => void
): void {
  const handler: FetchHandler = async (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();

    if (url.startsWith("/api/wardrobe/categories")) {
      return jsonResponse(200, { categories: CATEGORIES });
    }

    if (url === "/api/wardrobe/items" && method === "POST") {
      const form = init.body as FormData;
      const name = String(form.get("name") ?? "");
      const category = String(form.get("category") ?? "");
      const created = makeItem(items.length + 1, name, category);
      items.push(created);
      return jsonResponse(201, created);
    }

    if (/^\/api\/wardrobe\/items\/\d+$/.test(url) && method === "DELETE") {
      return jsonResponse(204, null);
    }

    if (url.startsWith("/api/wardrobe/items") && method === "GET") {
      return jsonResponse(200, items);
    }

    return jsonResponse(404, { detail: "Nicht gefunden" });
  };

  const mock = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const options = init ?? {};
    if (onRequest) {
      onRequest(url, options);
    }
    return handler(url, options, items);
  };

  vi.stubGlobal("fetch", mock);
}

function renderPage() {
  return render(<WardrobePage />);
}

async function openCreateForm() {
  fireEvent.click(
    screen.getByRole("button", { name: "Kleidungsstück anlegen" })
  );
  await screen.findByLabelText("Name");
}

function fillForm(name: string, category: string) {
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("Kategorie"), {
    target: { value: category },
  });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("token", "test-token");

  const url = URL as unknown as {
    createObjectURL?: (blob: Blob) => string;
    revokeObjectURL?: (objectUrl: string) => void;
  };
  if (!url.createObjectURL) {
    url.createObjectURL = () => "blob:mock";
    url.revokeObjectURL = () => {};
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("WardrobePage – Anlegen", () => {
  it("legt ein Kleidungsstück über das Formular an und zeigt es an", async () => {
    const items: TestItem[] = [];
    installFetch(items);

    renderPage();

    expect(
      await screen.findByText("Noch keine Kleidungsstücke")
    ).toBeTruthy();

    await openCreateForm();
    fillForm("Abendkleid", "oberteile");
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await screen.findByText("Abendkleid");
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Abendkleid");
    expect(items[0].category).toBe("oberteile");
  });
});

describe("WardrobePage – Filtern", () => {
  it("zeigt nach Kategorie-Auswahl nur passende Kleidungsstücke", async () => {
    const items: TestItem[] = [
      makeItem(1, "Bluse", "oberteile"),
      makeItem(2, "Jeans", "unterteile"),
    ];
    const calls: string[] = [];
    installFetch(items, (url) => calls.push(url));

    renderPage();

    await screen.findByText("Bluse");
    await screen.findByText("Jeans");

    fireEvent.click(screen.getByRole("button", { name: "oberteile" }));

    await waitFor(() => {
      expect(
        calls.some((url) => url.includes("category=oberteile"))
      ).toBe(true);
    });

    expect(screen.getByText("Bluse")).toBeTruthy();
    expect(screen.queryByText("Jeans")).toBeNull();
  });
});

describe("WardrobePage – Fehlermeldungen", () => {
  it("zeigt eine verständliche Meldung bei zu großem Upload (413)", async () => {
    const items: TestItem[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith("/api/wardrobe/categories")) {
          return jsonResponse(200, { categories: CATEGORIES });
        }
        if (url.startsWith("/api/wardrobe/items") && (init?.method ?? "GET") === "POST") {
          return jsonResponse(413, { detail: "Datei zu groß" });
        }
        return jsonResponse(200, items);
      })
    );

    renderPage();
    await openCreateForm();
    fillForm("Abendkleid", "oberteile");
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByText(/zu groß/)).toBeTruthy();
  });

  it("zeigt eine verständliche Meldung bei falschem Dateiformat (415)", async () => {
    const items: TestItem[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith("/api/wardrobe/categories")) {
          return jsonResponse(200, { categories: CATEGORIES });
        }
        if (url.startsWith("/api/wardrobe/items") && (init?.method ?? "GET") === "POST") {
          return jsonResponse(415, { detail: "Falscher Typ" });
        }
        return jsonResponse(200, items);
      })
    );

    renderPage();
    await openCreateForm();
    fillForm("Abendkleid", "oberteile");
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByText(/nicht unterstützt/)).toBeTruthy();
  });

  it("zeigt die Server-Validierungsmeldung bei 422 an", async () => {
    const items: TestItem[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith("/api/wardrobe/categories")) {
          return jsonResponse(200, { categories: CATEGORIES });
        }
        if (url.startsWith("/api/wardrobe/items") && (init?.method ?? "GET") === "POST") {
          return jsonResponse(422, { detail: "Ungültige Kategorie" });
        }
        return jsonResponse(200, items);
      })
    );

    renderPage();
    await openCreateForm();
    fillForm("Abendkleid", "oberteile");
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByText("Ungültige Kategorie")).toBeTruthy();
  });

  it("zeigt eine Validierungsmeldung bei leerem Namen", async () => {
    const items: TestItem[] = [];
    installFetch(items);

    renderPage();
    await openCreateForm();
    fillForm("", "oberteile");
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(
      await screen.findByText("Bitte geben Sie einen Namen ein.")
    ).toBeTruthy();
  });
});
