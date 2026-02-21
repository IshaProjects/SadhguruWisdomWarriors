import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { RbacProvider } from './context/RbacContext.jsx';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <RbacProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                className: '!bg-dark-800 !text-dark-100 !border !border-dark-700',
                duration: 3000,
              }}
            />
          </RbacProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
