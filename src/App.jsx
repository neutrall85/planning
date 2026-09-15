import { StoreProvider } from './context/StoreContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { useStore, useAuth } from './hooks';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';

function AppContent() {
  const { store, data, login } = useStore();
  const { user } = useAuth();
  const { showToast } = useToast();

  if (!user) {
    return (
      <LoginScreen
        db={data}
        registerEmployee={(payload) => store.registerEmployee(payload)}
        onLogin={login}
        toast={showToast}
      />
    );
  }
  return <MainLayout store={store} data={data} user={user} />;
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppContent />
        </ConfirmProvider>
      </ToastProvider>
    </StoreProvider>
  );
}