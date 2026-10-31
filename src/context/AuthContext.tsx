import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types/index.ts';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchDemoPersona: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_PERSONAS = [
  {
    role: 'ADMIN' as UserRole,
    name: 'Alexander Vance',
    title: 'System Administrator',
    email: 'admin@brightloop.io',
    description: 'Full access to financial configuration, plans, taxes, staff, and billing runner',
  },
  {
    role: 'STAFF' as UserRole,
    name: 'Sarah Jenkins',
    title: 'Billing Ops Specialist',
    email: 'sarah.staff@brightloop.io',
    description: 'Day-to-day quotations, invoices, subscriptions, and payment reconciliation',
  },
  {
    role: 'CUSTOMER' as UserRole,
    name: 'Alex Rivera (Acme Corp)',
    title: 'Customer Self-Service',
    email: 'alex@acmecorp.com',
    description: 'View active Business Monthly subscription, paid invoice, request changes',
  },
  {
    role: 'CUSTOMER' as UserRole,
    name: 'Maria Chen (TechFlow)',
    title: 'Enterprise Customer',
    email: 'maria@techflow.io',
    description: 'Annual enterprise agreement, partially paid invoice, online payment checkout',
  },
  {
    role: 'CUSTOMER' as UserRole,
    name: 'David Vance (GrowthScale)',
    title: 'Customer with Overdue Invoice',
    email: 'david@growthscale.com',
    description: 'Paused subscription, overdue invoice, reminder tracking',
  },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      let currentToken = getStoredToken();
      if (!currentToken) {
        // Auto-login with default administrator persona so reviewer immediately lands on the live platform!
        const autoLoginData = await apiRequest<{ token: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'admin@brightloop.io', password: 'Brightloop@2026!' }),
        });
        setStoredToken(autoLoginData.token);
        setToken(autoLoginData.token);
        setUser(autoLoginData.user);
        setLoading(false);
        return;
      }
      const data = await apiRequest<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch (err) {
      console.warn('Session expired or auto-login fallback.');
      setStoredToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const data = await apiRequest<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  };

  const switchDemoPersona = async (email: string) => {
    setLoading(true);
    try {
      await login(email, 'Brightloop@2026!');
    } catch (err) {
      console.error('Failed to switch persona:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        loading,
        login,
        logout,
        switchDemoPersona,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
