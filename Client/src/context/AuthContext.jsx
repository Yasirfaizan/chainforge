import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { setAuthHeader } from "../lib/api.js";
import { getChain } from "../constants/chains.js";

const STORAGE_KEY = "chainforge_auth";

const AuthContext = createContext(null);

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStorage(data) {
  if (!data) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => {
    const s = readStorage();
    return s?.token || null;
  });
  const [user, setUser] = useState(() => {
    const s = readStorage();
    return s?.user || null;
  });
  const [role, setRole] = useState(() => {
    const s = readStorage();
    return s?.role || null;
  });
  const [activeChain, setActiveChainState] = useState(() => {
    const s = readStorage();
    return s?.user?.chain || "ethereum";
  });

  useEffect(() => {
    if (token) {
      setAuthHeader(token);
    }
    setLoading(false);
  }, [token]);

  const persist = useCallback((nextToken, nextUser, nextRole) => {
    setToken(nextToken);
    setUser(nextUser);
    setRole(nextRole);
    setAuthHeader(nextToken);
    writeStorage({
      token: nextToken,
      user: nextUser,
      role: nextRole,
    });
  }, []);

  const loginClient = useCallback(
    async (nextToken, nextUser) => {
      persist(nextToken, nextUser, "client");
    },
    [persist]
  );

  const loginAdmin = useCallback(
    async (nextToken, nextUser) => {
      persist(nextToken, nextUser, "admin");
    },
    [persist]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setRole(null);
    setAuthHeader(null);
    writeStorage(null);
  }, []);

  const setActiveChain = useCallback((id) => {
    setActiveChainState(id);
    const c = getChain(id);
    setUser((u) => (u ? { ...u, chain: c.id } : u));
    const s = readStorage();
    if (s?.user) {
      writeStorage({ ...s, user: { ...s.user, chain: c.id } });
    }
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      role,
      activeChain,
      setActiveChain,
      loading,
      isAuthenticated: Boolean(token),
      loginClient,
      loginAdmin,
      logout,
    }),
    [
      loading,
      token,
      user,
      role,
      activeChain,
      setActiveChain,
      loginClient,
      loginAdmin,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  try {
    const ctx = useContext(AuthContext);
    if (!ctx) {
      console.error("useAuth: AuthContext is null. Make sure component is wrapped in AuthProvider.");
      throw new Error("useAuth must be inside AuthProvider");
    }
    return ctx;
  } catch (error) {
    console.error("useAuth error:", error);
    // Return a fallback to prevent complete app crash
    return {
      token: null,
      user: null,
      role: null,
      activeChain: "ethereum",
      loading: false,
      isAuthenticated: false,
      loginClient: async () => {},
      loginAdmin: async () => {},
      logout: () => {},
      setActiveChain: () => {},
    };
  }
}
