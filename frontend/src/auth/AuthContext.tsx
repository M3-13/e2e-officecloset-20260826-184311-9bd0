import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { request, setToken } from "../api";

export interface User {
  id?: number;
  username: string;
}

export interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setSession: (token: string, user: User) => void;
  clearSession: () => void;
}

const TOKEN_KEY = "token";
const USER_KEY = "user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

function usernameFromToken(token: string): string {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(base64UrlDecode(payload)) as { sub?: unknown };
    return typeof decoded.sub === "string" ? decoded.sub : "";
  } catch {
    return "";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<User | null>(() => readUser());

  useEffect(() => {
    setToken(token);
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fetch !== "function") {
      return;
    }
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      if (response.status === 401) {
        setTokenState(null);
        setUser(null);
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      login: async (username, password) => {
        const data = await request<{ access_token: string; token_type: string }>(
          "/auth/login",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          }
        );
        const loggedInUser: User = {
          username: usernameFromToken(data.access_token),
        };
        setTokenState(data.access_token);
        setUser(loggedInUser);
      },
      logout: () => {
        setTokenState(null);
        setUser(null);
      },
      setSession: (nextToken, nextUser) => {
        setTokenState(nextToken);
        setUser(nextUser);
      },
      clearSession: () => {
        setTokenState(null);
        setUser(null);
      },
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth muss innerhalb eines AuthProvider verwendet werden");
  }
  return context;
}
