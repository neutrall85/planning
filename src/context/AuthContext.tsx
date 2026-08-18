import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import DataStore from '../services/DataStore';
import type { Employee } from '../types';

/**
 * Интерфейс контекста аутентификации
 */
interface AuthContextType {
  user: Employee | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

/**
 * Пропсы провайдера аутентификации
 */
interface AuthProviderProps {
  children: ReactNode;
  store: DataStore;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children, store }: AuthProviderProps) => {
  const [user, setUser] = useState<Employee | null>(store.getCurrentUser() || null);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setUser(store.getCurrentUser() || null);
    });
    return unsub;
  }, [store]);

  // Мемоизируем функции для предотвращения лишних ре-рендеров
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = store.login(email, password);
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }, [store]);
  
  const logout = useCallback(() => {
    store.logout();
  }, [store]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export type { AuthContextType };
export default AuthContext;
