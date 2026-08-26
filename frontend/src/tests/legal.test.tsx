import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ImpressumPage from "../pages/ImpressumPage";
import DatenschutzPage from "../pages/DatenschutzPage";

afterEach(() => {
  cleanup();
});

describe("ImpressumPage", () => {
  it("zeigt Betreiber- und Kontaktangaben", () => {
    render(<ImpressumPage />);

    expect(screen.getByRole("heading", { name: "Impressum" })).toBeTruthy();
    expect(screen.getByText(/Glamour Garderobe/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Kontakt" })).toBeTruthy();
    expect(screen.getByText(/kontakt@glamour-garderobe\.example/)).toBeTruthy();
  });
});

describe("DatenschutzPage", () => {
  it("zeigt Hinweise zu Daten, Bild-Uploads, Tokens und Löschung", () => {
    render(<DatenschutzPage />);

    expect(
      screen.getByRole("heading", { name: "Datenschutzerklärung" })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "3. Bild-Uploads" })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "4. Tokens und Sitzungen" })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "5. Account-Löschung" })
    ).toBeTruthy();
  });
});
