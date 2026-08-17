import { StoreProvider } from './context/StoreContext';
import { useStore, useAuth, useToast } from './hooks';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import { logger, LOG_LEVELS } from './utils/logging/logger';

// Инициализация уровня логирования при запуске приложения
if (typeof window !== 'undefined') {
  // В продакшене устанавливаем уровень WARN, в разработке - DEBUG
  const isDev = import.meta.env.NODE_ENV === 'development';
  logger.setLevel(isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN);
  logger.info('Application initialized', { environment: import.meta.env.NODE_ENV || 'unknown' });
}

function AppContent() {
  const { store, data, login } = useStore();
  const { user } = useAuth();
  const { toast, ToastContainer } = useToast();

  if (!user) {
    return (
      <>
        <LoginScreen db={data} onLogin={login} toast={toast.error} store={store} />
        <ToastContainer />
      </>
    );
  }
  return (
    <>
      <MainLayout store={store} data={data} user={user} toast={toast} />
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
