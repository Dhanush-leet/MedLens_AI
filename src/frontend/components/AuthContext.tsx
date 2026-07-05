import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserInfo } from '../types';

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, lang?: 'en' | 'ta') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const verifyToken = useCallback(async (jwtToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setToken(jwtToken);
      } else {
        // Token invalid or expired
        localStorage.removeItem('medlens_auth_token');
        localStorage.removeItem('medlens_patient_name');
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.error('[AuthContext] Verification failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('medlens_auth_token');
    if (storedToken) {
      verifyToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, [verifyToken]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }
      localStorage.setItem('medlens_auth_token', data.token);
      localStorage.setItem('medlens_patient_name', data.user.name);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, lang?: 'en' | 'ta') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, language_preference: lang || 'en' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed.');
      }
      localStorage.setItem('medlens_auth_token', data.token);
      localStorage.setItem('medlens_patient_name', data.user.name);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('medlens_auth_token');
    localStorage.removeItem('medlens_patient_name');
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
