import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getApiBase } from "../lib/apiBase";

const STORAGE_KEY = "trella_auth_token";

export interface AuthUser {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  accountType?: "individual" | "company";
  companyName?: string;
  crNumber?: string;
  hasVat?: boolean;
  vatNumber?: string;
  logoUrl?: string;
  extraPhones?: string[];
  repName?: string;
  repPhone?: string;
  crDocumentUrl?: string;
  termsAccepted?: boolean;
  isAdmin?: boolean;
  companyStatus?: "pending" | "approved" | "rejected";
}

interface RegisterParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  accountType?: "individual" | "company";
  companyName?: string;
  crNumber?: string;
  hasVat?: boolean;
  vatNumber?: string;
  termsAccepted: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  logout: () => void;
  getAccessToken: () => string | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const apiBase = getApiBase();

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { detail?: string | unknown };
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail)) return JSON.stringify(j.detail);
  } catch {
    /* ignore */
  }
  return text || res.statusText;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (accessToken: string) => {
    const res = await fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setUser(null);
      return;
    }
    const data = (await res.json()) as AuthUser;
    setUser(data);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await fetchMe(token);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const data = (await res.json()) as { access_token: string };
    localStorage.setItem(STORAGE_KEY, data.access_token);
    setToken(data.access_token);
    await fetchMe(data.access_token);
  };

  const register = async (params: RegisterParams) => {
    const res = await fetch(`${apiBase}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const data = (await res.json()) as { access_token: string };
    localStorage.setItem(STORAGE_KEY, data.access_token);
    setToken(data.access_token);
    await fetchMe(data.access_token);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  const getAccessToken = () => token;

  const refreshUser = useCallback(async () => {
    if (!token) return;
    await fetchMe(token);
  }, [token, fetchMe]);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, getAccessToken, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
