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

export type AppTheme = "dark" | "light";
export type AppFontSize = "normal" | "large" | "extra";

interface AppContextValue {
  user: UserMe | null;
  activeLanguage: LanguageCode;
  isLoadingAuth: boolean;
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  fontSize: AppFontSize;
  setFontSize: (s: AppFontSize) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
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
  const [theme, setThemeState] = useState<AppTheme>("dark");
  const [fontSize, setFontSizeState] = useState<AppFontSize>("large");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Initialize theme & font size from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("lingua_theme") as AppTheme | null;
      const initialTheme = savedTheme === "light" ? "light" : "dark";
      setThemeState(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
      document.documentElement.classList.toggle("dark", initialTheme === "dark");

      const savedFontSize = localStorage.getItem("lingua_font_size") as AppFontSize | null;
      const initialFontSize = savedFontSize || "large";
      setFontSizeState(initialFontSize);
      applyFontSize(initialFontSize);
    } catch {
      // fallback to defaults
    }
  }, []);

  const applyFontSize = (size: AppFontSize) => {
    if (typeof document === "undefined") return;
    if (size === "normal") {
      document.documentElement.style.fontSize = "16px";
    } else if (size === "large") {
      document.documentElement.style.fontSize = "17.5px";
    } else if (size === "extra") {
      document.documentElement.style.fontSize = "19.5px";
    }
  };

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    try {
      localStorage.setItem("lingua_theme", t);
      document.documentElement.setAttribute("data-theme", t);
      document.documentElement.classList.toggle("dark", t === "dark");
    } catch {
      // ignore
    }
  }, []);

  const setFontSize = useCallback((s: AppFontSize) => {
    setFontSizeState(s);
    try {
      localStorage.setItem("lingua_font_size", s);
      applyFontSize(s);
    } catch {
      // ignore
    }
  }, []);

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
        theme,
        setTheme,
        fontSize,
        setFontSize,
        isSettingsOpen,
        setIsSettingsOpen,
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
