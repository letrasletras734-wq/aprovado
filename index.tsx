import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('🚀 Index.tsx carregando...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Não foi possível encontrar o elemento 'root' para montar o App.");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ React montado com sucesso.');
} catch (error: any) {
  console.error('💥 ERRO FATAL NA INICIALIZAÇÃO:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: white; background: #821; font-family: sans-serif; border-radius: 8px; margin: 20px;">
        <h1 style="margin-top: 0;">Erro de Inicialização</h1>
        <p>Ocorreu um erro crítico ao carregar o aplicativo:</p>
        <pre style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 4px; overflow: auto; max-width: 100%;">${error.message}\n\n${error.stack}</pre>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: white; color: #821; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Tentar Recarregar</button>
      </div>
    `;
  } else {
    document.body.innerHTML = `<div style="color: red; padding: 20px;">Erro crítico: Elemento root não encontrado e falha na montagem.</div>`;
  }
}