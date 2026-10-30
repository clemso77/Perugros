import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './utils/install';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <>
        <React.StrictMode>
            <App />
          </React.StrictMode>
    </>
);

// Service worker : installation de l'app et cache des modèles 3D
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}
