import { } from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h2>Что-то пошло не так</h2>
          <p style={{ color: '#666' }}>Попробуйте перезагрузить страницу или сообщите разработчику.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', marginTop: '12px', cursor: 'pointer' }}>
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}