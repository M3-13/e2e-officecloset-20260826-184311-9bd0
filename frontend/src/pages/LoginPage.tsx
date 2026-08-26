import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api";

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

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!username.trim()) {
      setError("Bitte gib deinen Benutzernamen ein.");
      return;
    }
    if (!password) {
      setError("Bitte gib dein Passwort ein.");
      return;
    }
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate("/wardrobe", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Benutzername oder Passwort ist falsch.");
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Zu viele Versuche. Bitte warte einen Moment.");
      } else {
        setError(
          err instanceof Error ? err.message : "Anmeldung fehlgeschlagen."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <h1 className="page__title">Anmelden</h1>
      <form className="card" style={formStyle} onSubmit={handleSubmit} noValidate>
        <div style={fieldStyle}>
          <label htmlFor="login-username" style={labelStyle}>
            Benutzername
          </label>
          <input
            id="login-username"
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="login-password" style={labelStyle}>
            Passwort
          </label>
          <input
            id="login-password"
            type="password"
            className="input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error ? (
          <p role="alert" style={errorStyle}>
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Wird angemeldet …" : "Anmelden"}
        </button>
        <p className="page__text">
          Noch kein Konto? <Link to="/register">Jetzt registrieren</Link>
        </p>
      </form>
    </section>
  );
}
