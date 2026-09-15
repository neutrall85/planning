import { useStore } from './useStore';

/**
 * Возвращает актуального пользователя сессии.
 *
 * Сравнение по ссылке здесь ненадёжно: Repository.save() заменяет
 * элемент на новый, а AuthService._currentUser может остаться старым.
 * Поэтому источник правды - data.employees, а _currentUser нужен только
 * чтобы знать id сессии. useStore уже держит подписку, derived-значение
 * пересчитывается автоматически - без useState/useEffect и без
 * re-render loop'ов.
 */
export const useAuth = () => {
  const { store, data } = useStore();
  const sessionUser = store.getCurrentUser();
  const userId = sessionUser?.id || null;

  const user = userId
    ? (data.employees.find(e => e.id === userId) || null)
    : null;

  const roles = user ? user.roles : [];
  const hasRole = (role) => roles.includes(role);
  const hasAnyRole = (...rs) => rs.some(r => roles.includes(r));
  return { user, roles, hasRole, hasAnyRole };
};