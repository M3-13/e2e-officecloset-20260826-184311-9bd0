import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import App from "../App";
import { AuthProvider } from "../auth/AuthContext";

describe("App-Shell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("rendert die Topbar mit Navigation", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByText("Glamour Garderobe")).toBeTruthy();
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByText("Garderobe")).toBeTruthy();
    expect(screen.getByText("Outfits")).toBeTruthy();
    expect(screen.getByText("Konto")).toBeTruthy();
  });

  it("verlinkt Impressum und Datenschutz im Footer", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByRole("link", { name: "Impressum" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Datenschutz" })).toBeTruthy();
  });

  it("leitet ohne Token von einer geschützten Route zur Anmeldung um", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByRole("heading", { name: "Anmelden" })).toBeTruthy();
  });
});
