// src/context/StoreContext.jsx
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import dataStore from '../services/DataStore';

const StoreContext = createContext(null);

/**
 * Возвращает объект-«сервис»: { store, login, logout }.
 *
 * НЕ возвращает data. Компоненты, которым нужен срез данных, читают
 * его через useSelector(selector) или (для переходного периода)
 * useStoreData(). Это устраняет каскадный ре-рендер дерева на каждый
 * _notify: подписчик, чей селектор вернул ту же ссылку, не рендерится.
 */
export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};

/**
 * Точечная подписка на срез стора.
 *
 * Селектор должен возвращать СТАБИЛЬНУЮ ССЫЛКУ, а не вычисленное
 * значение. Правильно:
 *     const tasks = useSelector(s => s.tasks);
 *     const one   = useSelector(s => s.tasks.find(t => t.id === id)); // тоже ок: find вернёт ту же ссылку
 * Неправильно (infinite loop - новый массив на каждый getSnapshot):
 *     const list = useSelector(s => s.tasks.filter(...));
 *
 * Для вычислений поверх среза - берём срез селектором и оборачиваем
 * в useMemo на стороне компонента.
 */
export const useSelector = (selector) => {
  const { store } = useStore();
  const subscribe = store.subscribe;
  const getSnapshot = store.getSnapshot;
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot()),
  );
};

/**
 * Переходный хук: возвращает весь корень _data целиком.
 *
 * Использовать только в коде, который ещё не переведён на точечные
 * useSelector-селекторы. Каждый вызов подписывается на все изменения
 * стора, поэтому каждый _notify рендерит этого потребителя - ровно то,
 * что useSelector позволяет избежать.
 */
export const useStoreData = () => {
  const { store } = useStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
};

export const StoreProvider = ({ children }) => {
  const value = useMemo(() => ({
    store: dataStore,
    login: (email, password) => dataStore.login(email, password),
    logout: () => dataStore.logout(),
  }), []);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};