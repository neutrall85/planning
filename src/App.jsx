import { StoreProvider } from './context/StoreContext';
import { useStore, useAuth } from './hooks';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';

function AppContent() {
  const { store, data, login, logout } = useStore();
  const { user } = useAuth();
  
  // Безопасный метод для обновления данных через публичный API
  const handleSetDb = (fn) => {
    const newData = fn(store.data);
    // Используем публичные методы вместо прямой мутации
    store.setData(newData);
  };

  if (!user) {
    return <LoginScreen db={data} setDb={handleSetDb} onLogin={login} toast={(msg) => alert(msg)} />;
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
