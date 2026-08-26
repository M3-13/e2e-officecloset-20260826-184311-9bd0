import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { request, ApiError } from "../api";
import type { Item, Outfit } from "../types";

const FORM_ERROR_STYLE: CSSProperties = {
  color: "var(--color-fg)",
  backgroundColor: "rgba(192, 82, 74, 0.12)",
  border: "1px solid var(--color-danger)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 12px",
  fontSize: "var(--size-sm)",
  marginTop: "8px",
};

interface OutfitCreatorProps {
  onSaved: (outfit: Outfit) => void;
}

export default function OutfitCreator({ onSaved }: OutfitCreatorProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    request<Item[]>("/wardrobe/items")
      .then((data) => {
        if (!active) return;
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Die Garderobe konnte nicht geladen werden."
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function toggleItem(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Bitte einen Namen für das Outfit angeben.");
      return;
    }
    if (selectedIds.length === 0) {
      setFormError("Bitte mindestens ein Kleidungsstück auswählen.");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const outfit = await request<Outfit>("/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), item_ids: selectedIds }),
      });
      setName("");
      setSelectedIds([]);
      onSaved(outfit);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Das Outfit konnte nicht gespeichert werden."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" aria-label="Outfit-Creator">
      <h2 className="page__title">Outfit-Creator</h2>

      {loading && <p className="page__text">Garderobe wird geladen …</p>}

      {loadError && (
        <div role="alert" style={FORM_ERROR_STYLE}>
          {loadError}
        </div>
      )}

      {!loading && !loadError && items.length === 0 && (
        <p className="page__text">
          Noch keine Kleidungsstücke in der Garderobe. Lege zuerst Kleidungsstücke
          an, um sie hier zu kombinieren.
        </p>
      )}

      {!loading && items.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "16px",
            margin: "16px 0",
          }}
        >
          {items.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className="card outfit-item-tile"
                aria-pressed={selected}
                onClick={() => toggleItem(item.id)}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  borderColor: selected
                    ? "var(--color-accent)"
                    : "var(--color-border)",
                  background: selected
                    ? "var(--color-accent_soft)"
                    : "var(--color-surface)",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    display: "block",
                    color: "var(--color-fg)",
                  }}
                >
                  {item.name}
                </span>
                <span
                  style={{
                    fontSize: "var(--size-xs)",
                    color: "var(--color-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {item.category}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <label
          htmlFor="outfit-name"
          style={{
            display: "block",
            marginBottom: "var(--space-1)",
            color: "var(--color-fg)",
            fontWeight: 600,
          }}
        >
          Name des Outfits
        </label>
        <input
          id="outfit-name"
          className="input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Abend-Gala"
          style={{ width: "100%", marginBottom: "var(--space-3)" }}
        />
        {formError && (
          <div role="alert" style={{ ...FORM_ERROR_STYLE, marginBottom: "var(--space-3)" }}>
            {formError}
          </div>
        )}
        <button
          type="submit"
          className="btn"
          disabled={saving}
        >
          {saving ? "Wird gespeichert …" : "Outfit speichern"}
        </button>
      </form>
    </section>
  );
}
