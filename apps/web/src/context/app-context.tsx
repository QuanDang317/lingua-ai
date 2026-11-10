"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiClient, getStoredToken, setStoredToken } from "@/lib/api";
import { LanguageCode, UserMe } from "@/types";

interface AppContextValue {
  user: UserMe | null;
  activeLanguage: LanguageCode;
  isLoadingAuth: boolean;
  switchLanguage: (lang: LanguageCode) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUserState: (user: UserMe | null) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>("zh");
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const initAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const token = getStoredToken();
      if (token) {
        const me = await apiClient.getMe();
        setUser(me);
        setActiveLanguage(me.profile.active_language_code);
        setIsLoadingAuth(false);
        return;
      }
      // Seamless auto demo-login on first visit so Dashboard & Roadmap work out-of-the-box
      const demo = await apiClient.demoLogin();
      setUser(demo.user);
      setActiveLanguage(demo.user.profile.active_language_code);
    } catch {
      try {
        const demo = await apiClient.demoLogin();
        setUser(demo.user);
        setActiveLanguage(demo.user.profile.active_language_code);
      } catch {
        setUser(null);
      }
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  const switchLanguage = useCallback(async (lang: LanguageCode) => {
    setActiveLanguage(lang);
    try {
      const updated = await apiClient.updatePreferences({
        active_language_code: lang,
      });
      setUser(updated);
    } catch {
      // keep optimistic UI update
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiClient.getMe();
      setUser(me);
      setActiveLanguage(me.profile.active_language_code);
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        activeLanguage,
        isLoadingAuth,
        switchLanguage,
        refreshUser,
        setUserState: setUser,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return ctx;
}
