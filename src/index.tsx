import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import { I18nProvider } from './i18n';
import './css/styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <I18nProvider>
      <App />
    </I18nProvider>
  </ErrorBoundary>
);