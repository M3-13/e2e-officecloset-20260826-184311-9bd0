import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import OutfitsPage from "../pages/OutfitsPage";

const item1 = {
  id: 1,
  name: "Rotes Kleid",
  category: "oberteile",
  image_url: null,
  created_at: "2026-01-01T00:00:00Z",
};
const item2 = {
  id: 2,
  name: "Goldene Schuhe",
  category: "schuhe",
  image_url: null,
  created_at: "2026-01-01T00:00:00Z",
};
const outfit = {
  id: 10,
  name: "Abend-Gala",
  item_ids: [1, 2],
  items: [item1, item2],
  created_at: "2026-01-01T00:00:00Z",
};

type Handler = (
  url: string,
  init?: RequestInit
) => { status: number; body?: unknown };

function mockFetch(handler: Handler) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = handler(url, init);
    return {
      status,
      ok: status >= 200 && status < 300,
      statusText: "OK",
      json: async () => body ?? null,
    };
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("Outfits", () => {
  beforeEach(() => {
    localStorage.setItem("token", "test-token");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("kombiniert Kleidungsstücke und speichert sie als Outfit", async () => {
    let saved = false;
    let savedBody: { name: string; item_ids: number[] } | null = null;

    mockFetch((url, init) => {
      if (url === "/api/wardrobe/items") {
        return { status: 200, body: [item1, item2] };
      }
      if (url === "/api/outfits" && init?.method === "POST") {
        savedBody = JSON.parse(String(init.body)) as {
          name: string;
          item_ids: number[];
        };
        saved = true;
        return { status: 201, body: outfit };
      }
      if (url === "/api/outfits") {
        return { status: 200, body: saved ? [outfit] : [] };
      }
      return { status: 404, body: { detail: "not found" } };
    });

    render(<OutfitsPage />);

    await screen.findByText("Rotes Kleid");
    fireEvent.click(screen.getByRole("button", { name: /Rotes Kleid/ }));
    fireEvent.click(screen.getByRole("button", { name: /Goldene Schuhe/ }));
    fireEvent.change(screen.getByLabelText("Name des Outfits"), {
      target: { value: "Abend-Gala" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Outfit speichern" }));

    await waitFor(() => {
      expect(savedBody).toEqual({ name: "Abend-Gala", item_ids: [1, 2] });
    });

    expect(await screen.findByText("Abend-Gala")).toBeTruthy();
  });

  it("zeigt einen Validierungsfehler bei leerem Namen", async () => {
    mockFetch((url) => {
      if (url === "/api/wardrobe/items") {
        return { status: 200, body: [item1] };
      }
      if (url === "/api/outfits") {
        return { status: 200, body: [] };
      }
      return { status: 404, body: { detail: "not found" } };
    });

    render(<OutfitsPage />);

    await screen.findByText("Rotes Kleid");
    fireEvent.click(screen.getByRole("button", { name: /Rotes Kleid/ }));
    fireEvent.click(screen.getByRole("button", { name: "Outfit speichern" }));

    expect(
      await screen.findByText("Bitte einen Namen für das Outfit angeben.")
    ).toBeTruthy();
  });

  it("zeigt einen Validierungsfehler bei fehlender Auswahl", async () => {
    mockFetch((url) => {
      if (url === "/api/wardrobe/items") {
        return { status: 200, body: [item1] };
      }
      if (url === "/api/outfits") {
        return { status: 200, body: [] };
      }
      return { status: 404, body: { detail: "not found" } };
    });

    render(<OutfitsPage />);

    await screen.findByText("Rotes Kleid");
    fireEvent.change(screen.getByLabelText("Name des Outfits"), {
      target: { value: "Mein Outfit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Outfit speichern" }));

    expect(
      await screen.findByText(
        "Bitte mindestens ein Kleidungsstück auswählen."
      )
    ).toBeTruthy();
  });

  it("öffnet ein Outfit in der Detailansicht", async () => {
    mockFetch((url) => {
      if (url === "/api/wardrobe/items") {
        return { status: 200, body: [] };
      }
      if (url === "/api/outfits/10") {
        return { status: 200, body: outfit };
      }
      if (url === "/api/outfits") {
        return { status: 200, body: [outfit] };
      }
      return { status: 404, body: { detail: "not found" } };
    });

    render(<OutfitsPage />);

    const openButton = await screen.findByRole("button", { name: "Öffnen" });
    fireEvent.click(openButton);

    expect(await screen.findByText("Rotes Kleid")).toBeTruthy();
    expect(screen.getByText("Goldene Schuhe")).toBeTruthy();
  });

  it("löscht ein Outfit aus der Übersicht", async () => {
    let deleted = false;
    vi.spyOn(window, "confirm").mockReturnValue(true);

    mockFetch((url, init) => {
      if (url === "/api/wardrobe/items") {
        return { status: 200, body: [] };
      }
      if (url === "/api/outfits/10" && init?.method === "DELETE") {
        deleted = true;
        return { status: 204, body: null };
      }
      if (url === "/api/outfits") {
        return { status: 200, body: deleted ? [] : [outfit] };
      }
      return { status: 404, body: { detail: "not found" } };
    });

    render(<OutfitsPage />);

    const deleteButton = await screen.findByRole("button", { name: "Löschen" });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText("Abend-Gala")).toBeNull();
    });
    expect(screen.getByText("Noch keine Outfits gespeichert.")).toBeTruthy();
  });
});
