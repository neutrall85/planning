import React from 'react';

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
        <div className="p-5 text-center" style={{ fontFamily: 'sans-serif' }}>
          <h2>Что-то пошло не так</h2>
          <p className="text-mut">Попробуйте перезагрузить страницу или сообщите разработчику.</p>
          <button onClick={() => window.location.reload()} className="p-2 mt-3 cursor-pointer">
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}