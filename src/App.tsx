import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { useData, useAuth, useToast } from './hooks';
import { ToastContainer } from './hooks/useToast';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import { logger, LOG_LEVELS } from './utils/logging/logger';
import DataStore from './services/DataStore';

// Инициализация уровня логирования при запуске приложения
if (typeof window !== 'undefined') {
  // В продакшене устанавливаем уровень WARN, в разработке - DEBUG
  const isDev = import.meta.env.NODE_ENV === 'development';
  logger.setLevel(isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN);
  logger.info('Application initialized', { environment: import.meta.env.NODE_ENV || 'unknown' });
}

function AppContent() {
  const { store, data } = useData();
  const { user, login, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen db={data} onLogin={login} toast={toast.error} store={store} />
        <ToastContainer />
      </>
    );
  }
  return (
    <>
      <MainLayout store={store} data={data} user={user!} toast={toast} />
      <ToastContainer />
    </>
  );
}

export default function App() {
  const store = new DataStore();
  
  return (
    <DataProvider>
      <AuthProvider store={store}>
        <AppContent />
      </AuthProvider>
    </DataProvider>
  );
}
