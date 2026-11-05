import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error('App crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: '-apple-system, system-ui, sans-serif' }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Что-то пошло не так</div>
          <div style={{ fontSize: 13, color: '#818c99', marginBottom: 16, wordBreak: 'break-word' }}>
            {String((this.state.error && this.state.error.message) || this.state.error || 'Неизвестная ошибка')}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{
              height: 40,
              padding: '0 18px',
              borderRadius: 8,
              border: 'none',
              background: '#2688eb',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Продолжить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
