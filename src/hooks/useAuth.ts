import { useContext } from 'react';
import AuthContext, { type AuthContextType } from '../context/AuthContext';

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  
  const { user, login, logout, isAuthenticated } = ctx;
  const roles = user ? user.roles : [];
  const hasRole = (role: string) => roles.includes(role as any);
  const hasAnyRole = (...rs: string[]) => rs.some(r => roles.includes(r as any));
  
  return { user, roles, hasRole, hasAnyRole, login, logout, isAuthenticated };
};
