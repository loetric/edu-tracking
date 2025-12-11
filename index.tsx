import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import App from './App';

// Wait for fonts to load before rendering to prevent layout shift
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Wait for fonts to be ready
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
} else {
  // Fallback for browsers that don't support Font Loading API
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
}
