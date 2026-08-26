import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  Outlet,
} from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WardrobePage from "./pages/WardrobePage";
import OutfitsPage from "./pages/OutfitsPage";
import ImpressumPage from "./pages/ImpressumPage";
import DatenschutzPage from "./pages/DatenschutzPage";
import AccountPage from "./pages/AccountPage";

function RequireAuth() {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function Layout() {
  const { token, user, clearSession } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="topbar__brand">
          Glamour Garderobe
        </Link>
        <nav className="topbar__nav" aria-label="Hauptnavigation">
          <NavLink to="/wardrobe">Garderobe</NavLink>
          <NavLink to="/outfits">Outfits</NavLink>
          <NavLink to="/account">Konto</NavLink>
          {token ? (
            <button
              type="button"
              className="topbar__logout"
              onClick={clearSession}
            >
              Abmelden{user ? ` (${user.username})` : ""}
            </button>
          ) : (
            <>
              <NavLink to="/login">Anmelden</NavLink>
              <NavLink to="/register">Registrieren</NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <footer className="footer">
        <Link to="/impressum">Impressum</Link>
        <Link to="/datenschutz">Datenschutz</Link>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/wardrobe" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/impressum" element={<ImpressumPage />} />
          <Route path="/datenschutz" element={<DatenschutzPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/wardrobe" element={<WardrobePage />} />
            <Route path="/outfits" element={<OutfitsPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
