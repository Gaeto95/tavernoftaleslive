import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AdminButton } from './components/AdminButton.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AdminButton />
  </StrictMode>
);