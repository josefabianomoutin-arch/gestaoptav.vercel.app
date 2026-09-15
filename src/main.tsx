
window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('GLOBAL ERROR:', msg, url, lineNo, columnNo, error);
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.background = 'red';
  el.style.color = 'white';
  el.style.padding = '20px';
  el.style.zIndex = '9999';
  el.innerText = msg + ' ' + (error ? error.stack : '');
  document.body.appendChild(el);
  return false;
};
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from './components/ErrorBoundary';

// Register service worker for offline support
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
