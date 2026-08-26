import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError, request } from "../api";

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
  maxWidth: 420,
  padding: "var(--space-4)",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-1)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--size-sm)",
  color: "var(--color-muted)",
};

const errorStyle: React.CSSProperties = {
  color: "var(--color-danger)",
  fontSize: "var(--size-sm)",
  margin: 0,
};

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!username.trim()) {
      setError("Bitte gib einen Benutzernamen ein.");
      return;
    }
    if (!password) {
      setError("Bitte gib ein Passwort ein.");
      return;
    }
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setSubmitting(true);
    try {
      await request<{ id: number; username: string }>("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      await login(username.trim(), password);
      navigate("/wardrobe", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Dieser Benutzername ist bereits vergeben.");
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Zu viele Anfragen. Bitte warte einen Moment.");
      } else {
        setError(
          err instanceof Error ? err.message : "Registrierung fehlgeschlagen."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <h1 className="page__title">Registrieren</h1>
      <form className="card" style={formStyle} onSubmit={handleSubmit} noValidate>
        <div style={fieldStyle}>
          <label htmlFor="register-username" style={labelStyle}>
            Benutzername
          </label>
          <input
            id="register-username"
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="register-password" style={labelStyle}>
            Passwort
          </label>
          <input
            id="register-password"
            type="password"
            className="input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="register-confirm" style={labelStyle}>
            Passwort wiederholen
          </label>
          <input
            id="register-confirm"
            type="password"
            className="input"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error ? (
          <p role="alert" style={errorStyle}>
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Wird registriert …" : "Registrieren"}
        </button>
        <p className="page__text">
          Schon ein Konto? <Link to="/login">Jetzt anmelden</Link>
        </p>
      </form>
    </section>
  );
}
