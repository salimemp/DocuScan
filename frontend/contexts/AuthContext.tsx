import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const AUTH_TOKEN_KEY = '@DocScanPro:authToken';
const REFRESH_TOKEN_KEY = '@DocScanPro:refreshToken';
const USER_KEY = '@DocScanPro:user';

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  passkey_enabled: boolean;
  subscription_tier?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; requires_2fa?: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track mounted state to prevent memory leaks
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadStoredAuth();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [token, userStr] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (token && userStr) {
        setAccessToken(token);
        setUser(JSON.parse(userStr));
        
        // Verify token is still valid
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
        } else {
          // Token invalid, try refresh
          await tryRefreshToken();
        }
      }
    } catch (e) {
      console.log('Error loading auth:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const tryRefreshToken = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        await clearAuth();
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        await saveAuth(data.access_token, data.refresh_token);
        await refreshUser();
      } else {
        await clearAuth();
      }
    } catch (e) {
      await clearAuth();
    }
  };

  const saveAuth = async (token: string, refresh: string) => {
    setAccessToken(token);
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  };

  const clearAuth = async () => {
    setUser(null);
    setAccessToken(null);
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; requires_2fa?: boolean; error?: string }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.detail || 'Login failed' };
      }

      if (data.requires_2fa) {
        // Store temp token for 2FA
        await AsyncStorage.setItem('@DocScanPro:2faToken', data.access_token);
        return { success: true, requires_2fa: true };
      }

      await saveAuth(data.access_token, data.refresh_token);
      setUser(data.user);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.detail || 'Registration failed' };
      }

      await saveAuth(data.access_token, data.refresh_token);
      setUser(data.user);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    } catch (e) {
      // Ignore errors
    }
    await clearAuth();
  };

  const refreshUser = useCallback(async () => {
    if (!accessToken) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      }
    } catch (e) {
      console.log('Error refreshing user:', e);
    }
  }, [accessToken]);

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        accessToken,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
