import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Assuming App.tsx will be fixed to have a valid default export
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);