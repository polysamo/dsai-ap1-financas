import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { aplicarPreferencias, lerPreferencias } from './lib/preferencias';
import { Store, StoreProvider } from './state/store';
import './index.css';

aplicarPreferencias(lerPreferencias(window.localStorage));

const store = new Store(window.localStorage);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider store={store}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
