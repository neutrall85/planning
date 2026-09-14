import { StoreProvider } from './context/StoreContext';
import { ToastProvider, useToast } from './context/ToastContext';
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
        // Регистрация идёт через сервис, а не мутацией store._data:
        // иначе Repository теряет ссылку на массив employees и любой
        // последующий апдейт сотрудника пишет в «мёртвый» массив.
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
        <AppContent />
      </ToastProvider>
    </StoreProvider>
  );
}