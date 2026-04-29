import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth as api, saveToken, clearToken, getToken, type UserProfile } from './api';
import i18n from './i18n';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  setUser: (u: UserProfile) => void;
  signInWithMagicLink: (token: string) => Promise<void>;
  signInWithFirebaseToken: (firebaseToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken()
      .then((token) => {
        if (!token) return null;
        return api.me();
      })
      .then((profile) => { if (profile) setUser(profile); })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.language) i18n.changeLanguage(user.language);
  }, [user?.language]);

  async function signInWithMagicLink(token: string) {
    await saveToken(token);
    const profile = await api.me();
    setUser(profile);
  }

  async function signInWithFirebaseToken(firebaseToken: string) {
    const data = await api.login(firebaseToken);
    await saveToken(data.token);
    setUser(data);
  }

  async function logout() {
    try { await api.unregisterPushToken(); } catch {}
    await clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, signInWithMagicLink, signInWithFirebaseToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
