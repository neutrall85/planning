import { StoreProvider } from './context/StoreContext';
import { useStore, useAuth } from './hooks';
import { useToast } from './components/Toast';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import { logger, LOG_LEVELS } from './utils/logging/logger';

// Инициализация уровня логирования при запуске приложения
if (typeof window !== 'undefined') {
  // В продакшене устанавливаем уровень WARN, в разработке - DEBUG
  const isDev = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';
  logger.setLevel(isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN);
  logger.info('Application initialized', { environment: typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : 'unknown' });
}

function AppContent() {
  const { store, data, login } = useStore();
  const { user } = useAuth();
  const { toast, ToastContainer } = useToast();
  
  // Безопасный метод для обновления данных через публичный API с логированием
  const handleSetDb = (fn) => {
    const stopTimer = logger.startTimer('handleSetDb');
    try {
      const newData = fn(store.data);
      // Используем публичные методы вместо прямой мутации
      store.setData(newData);
      logger.debug('Database updated successfully');
    } catch (error) {
      logger.errorWithStack(error, 'Failed to update database');
      throw error;
    } finally {
      stopTimer();
    }
  };

  if (!user) {
    return (
      <>
        <LoginScreen db={data} setDb={handleSetDb} onLogin={login} toast={toast.error} />
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
