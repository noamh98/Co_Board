import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { ErrorBoundary } from './presentation/ui/ErrorBoundary';
import './index.css';
// Phase 2 (F6): ריברנד קורל — מקור-אמת יחיד. חייב להיטען *אחרי* index.css כדי שינצח.
import './presentation/ui/tokens.css';
import './presentation/ui/mvpUx.css';

// Offline-first: רישום Service Worker (vite-plugin-pwa).
registerSW({ immediate: true });

const container = document.getElementById('root');
if (!container) throw new Error('root element not found');

createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
