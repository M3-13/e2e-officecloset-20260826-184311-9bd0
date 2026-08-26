import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setToken } from "../api";

export interface User {
  id: number;
  username: string;
}

export interface AuthContextValue {
  token: string | null;
  user: User | null;
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

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
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
