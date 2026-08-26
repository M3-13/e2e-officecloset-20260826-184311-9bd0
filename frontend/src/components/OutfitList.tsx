import { useEffect, useState, type CSSProperties } from "react";
import { request, ApiError } from "../api";
import type { Outfit } from "../types";

const FORM_ERROR_STYLE: CSSProperties = {
  color: "var(--color-fg)",
  backgroundColor: "rgba(192, 82, 74, 0.12)",
  border: "1px solid var(--color-danger)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 12px",
  fontSize: "var(--size-sm)",
  marginTop: "8px",
};

const MODAL_OVERLAY_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(15, 12, 9, 0.7)",
  padding: "16px",
};

const MODAL_DIALOG_STYLE: CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  maxWidth: 480,
  width: "100%",
  padding: "var(--space-4)",
  boxShadow: "0 16px 48px rgba(0, 0, 0, 0.4)",
};

interface OutfitListProps {
  refreshKey: number;
}

export default function OutfitList({ refreshKey }: OutfitListProps) {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Outfit | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    request<Outfit[]>("/outfits")
      .then((data) => {
        if (!active) return;
        setOutfits(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Die Outfits konnten nicht geladen werden."
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  async function openOutfit(id: number) {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const outfit = await request<Outfit>(`/outfits/${id}`);
      setSelected(outfit);
    } catch (err) {
      setDetailError(
        err instanceof ApiError
          ? err.message
          : "Das Outfit konnte nicht geöffnet werden."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closeOutfit() {
    setSelected(null);
    setDetailError(null);
  }

  async function deleteOutfit(id: number) {
    if (!window.confirm("Dieses Outfit wirklich löschen?")) {
      return;
    }
    setDeletingId(id);
    setDeleteError(null);
    try {
      await request(`/outfits/${id}`, { method: "DELETE" });
      setOutfits((prev) => prev.filter((o) => o.id !== id));
      if (selected?.id === id) {
        setSelected(null);
      }
    } catch (err) {
      setDeleteError(
        err instanceof ApiError
          ? err.message
          : "Das Outfit konnte nicht gelöscht werden."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="card" aria-label="Outfit-Übersicht" style={{ marginTop: "var(--space-5)" }}>
      <h2 className="page__title">Gespeicherte Outfits</h2>

      {loading && <p className="page__text">Outfits werden geladen …</p>}

      {error && (
        <div role="alert" style={FORM_ERROR_STYLE}>
          {error}
        </div>
      )}

      {deleteError && (
        <div role="alert" style={FORM_ERROR_STYLE}>
          {deleteError}
        </div>
      )}

      {!loading && !error && outfits.length === 0 && (
        <p className="page__text">Noch keine Outfits gespeichert.</p>
      )}

      {!loading && outfits.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: "16px 0 0",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          {outfits.map((outfit) => (
            <li key={outfit.id} className="card">
              <span
                style={{
                  fontWeight: 600,
                  display: "block",
                  color: "var(--color-fg)",
                }}
              >
                {outfit.name}
              </span>
              <span
                style={{
                  fontSize: "var(--size-xs)",
                  color: "var(--color-muted)",
                  display: "block",
                  margin: "var(--space-1) 0 var(--space-2)",
                }}
              >
                {outfit.items.length}{" "}
                {outfit.items.length === 1 ? "Teil" : "Teile"}
              </span>
              <div style={{ display: "flex", gap: "var(--space-1)" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => openOutfit(outfit.id)}
                  disabled={detailLoading}
                >
                  Öffnen
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => deleteOutfit(outfit.id)}
                  disabled={deletingId === outfit.id}
                  style={{ backgroundColor: "var(--color-danger)" }}
                >
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div
          style={MODAL_OVERLAY_STYLE}
          onClick={closeOutfit}
          role="dialog"
          aria-modal="true"
          aria-label={`Outfit ${selected.name}`}
        >
          <div style={MODAL_DIALOG_STYLE} onClick={(e) => e.stopPropagation()}>
            <h2
              className="page__title"
              style={{ fontSize: "var(--size-lg)", marginTop: 0 }}
            >
              {selected.name}
            </h2>
            {detailError && (
              <div role="alert" style={FORM_ERROR_STYLE}>
                {detailError}
              </div>
            )}
            {selected.items.length === 0 ? (
              <p className="page__text">Dieses Outfit enthält keine Teile.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {selected.items.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      padding: "var(--space-2) 0",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--color-fg)",
                        display: "block",
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
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="btn"
              onClick={closeOutfit}
              style={{ marginTop: "var(--space-3)" }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
