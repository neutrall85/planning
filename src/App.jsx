import React from 'react';
import { StoreProvider } from './context/StoreContext';
import { useStore, useAuth } from './hooks';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';

function AppContent() {
  const { store, data, login, logout } = useStore();
  const { user } = useAuth();

  if (!user) {
    return <LoginScreen db={data} setDb={(fn) => { store._data = fn(store._data); store._notify(); }} onLogin={login} toast={(msg) => alert(msg)} />;
  }
  return <MainLayout store={store} data={data} user={user} />;
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}