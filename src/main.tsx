import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';
import './vk617.css';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppRoot>
        <App />
      </AppRoot>
    </ErrorBoundary>
  </React.StrictMode>,
);
