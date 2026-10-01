import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Store, StoreProvider } from './state/store';
import './index.css';

const store = new Store(window.localStorage);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider store={store}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
