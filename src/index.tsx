import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary'; // 🚨 (1.3) استيراد
// import { ToastProvider } from './context/ToastContext'; // (سنحتاجها في Task 2.3)

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary> {/* 🚨 (1.3) تغليف التطبيق */}
      {/* <ToastProvider> */}
        <App />
      {/* </ToastProvider> */}
    </ErrorBoundary>
  </React.StrictMode>
);