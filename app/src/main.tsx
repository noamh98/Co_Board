import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { ErrorBoundary } from './presentation/ui/ErrorBoundary';
import { InstallInstructions } from './presentation/pwa/InstallInstructions';
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
      {/* 2.6 (C-07): רמז התקנה ל-iOS — באנר לא-חוסם, מציג את עצמו רק ב-iOS Safari לא-מותקן. */}
      <InstallInstructions />
    </ErrorBoundary>
  </React.StrictMode>,
);
