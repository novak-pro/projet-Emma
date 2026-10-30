import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken } from "../lib/api";
import type { Admin } from "../lib/types";

interface AuthContextValue {
  token: string | null;
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .me()
      .then((value) => {
        if (active) setAdmin(value);
      })
      .catch(() => {
        if (active) {
          setToken(null);
          setTokenState(null);
          setAdmin(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setTokenState(null);
      setAdmin(null);
    };
    window.addEventListener("projetemma:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("projetemma:unauthorized", handleUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    setToken(response.token);
    setTokenState(response.token);
    setAdmin(response.admin);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ token, admin, loading, login, logout }),
    [token, admin, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans AuthProvider");
  }
  return context;
}
