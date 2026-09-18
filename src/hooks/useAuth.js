// src/hooks/useAuth.js
import { useSelector } from '../context/StoreContext';

/**
 * Возвращает актуального пользователя сессии.
 *
 * Источник правды - два среза стора:
 *   - session.userId - id того, кто вошёл;
 *   - employees      - данные сотрудника.
 *
 * Оба читаются через useSelector, значит логин/логаут/изменение
 * профиля триггерят ровно те компоненты, которые используют этот хук.
 *
 * Раньше здесь был store.getCurrentUser() - обращение к AuthService
 * в обход подписки. Это не работало: изменение _currentUser не меняло
 * ссылку на срезы, и React не перерисовывал AppContent после логина.
 */
export const useAuth = () => {
  const session   = useSelector(s => s.session);
  const employees = useSelector(s => s.employees);

  const userId = session?.userId || null;
  const user = userId
    ? (employees.find(e => e.id === userId) || null)
    : null;

  const roles = user ? user.roles : [];
  const hasRole = (role) => roles.includes(role);
  const hasAnyRole = (...rs) => rs.some(r => roles.includes(r));
  return { user, roles, hasRole, hasAnyRole };
};