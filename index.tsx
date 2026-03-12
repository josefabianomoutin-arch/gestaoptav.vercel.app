
console.log("Aplicação iniciando...");
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Erro Global:", message, "em", source, ":", lineno);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h2>Erro de Carregamento</h2>
      <p>${message}</p>
      <p>Por favor, tente recarregar a página.</p>
    </div>`;
  }
};
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <App />
);
