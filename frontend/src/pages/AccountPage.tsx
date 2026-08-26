import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError, request } from "../api";

const cardStyle: React.CSSProperties = {
  maxWidth: 420,
  padding: "var(--space-4)",
  marginTop: "var(--space-4)",
};

const dangerTitleStyle: React.CSSProperties = {
  fontSize: "var(--size-lg)",
  margin: "0 0 var(--space-2)",
};

const errorStyle: React.CSSProperties = {
  color: "var(--color-danger)",
  fontSize: "var(--size-sm)",
  margin: "var(--space-2) 0",
};

const dangerButtonStyle: React.CSSProperties = {
  backgroundColor: "var(--color-danger)",
  color: "var(--color-fg)",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-2)",
  marginTop: "var(--space-3)",
  flexWrap: "wrap",
};

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      await request("/users/me", { method: "DELETE" });
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        navigate("/login", { replace: true });
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Das Konto konnte nicht gelöscht werden."
        );
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="page">
      <h1 className="page__title">Konto</h1>
      <div className="card" style={cardStyle}>
        <p className="page__text">
          Angemeldet als <strong style={{ color: "var(--color-fg)" }}>{user?.username ?? "unbekannt"}</strong>
        </p>
      </div>
      <div className="card" style={cardStyle}>
        <h2 style={dangerTitleStyle}>Konto löschen</h2>
        <p className="page__text">
          Dabei werden dein Benutzerdatensatz, deine Garderobe, deine Outfits und
          alle hochgeladenen Bilder dauerhaft entfernt.
        </p>
        {error ? (
          <p role="alert" style={errorStyle}>
            {error}
          </p>
        ) : null}
        {confirming ? (
          <>
            <p className="page__text">
              Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div style={actionsStyle}>
              <button
                type="button"
                className="btn"
                style={dangerButtonStyle}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Wird gelöscht …" : "Ja, endgültig löschen"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Abbrechen
              </button>
            </div>
          </>
        ) : (
          <div style={actionsStyle}>
            <button
              type="button"
              className="btn"
              style={dangerButtonStyle}
              onClick={() => setConfirming(true)}
            >
              Konto löschen
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
