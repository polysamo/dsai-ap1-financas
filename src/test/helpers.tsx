import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../App';
import { CHAVE_ESTADO, salvar } from '../storage/storage';
import { Store, StoreProvider } from '../state/store';
import type { AppState } from '../domain/types';

/** Renderiza o app numa rota, opcionalmente com um estado pré-salvo no localStorage. */
export function renderizarApp(rota = '/', estado?: AppState) {
  if (estado) salvar(estado, localStorage);
  const store = new Store(localStorage);
  const utils = render(
    <StoreProvider store={store}>
      <MemoryRouter initialEntries={[rota]}>
        <AppRoutes />
      </MemoryRouter>
    </StoreProvider>,
  );
  return { store, ...utils };
}

export function lerEstadoSalvo(): AppState {
  return JSON.parse(localStorage.getItem(CHAVE_ESTADO) ?? 'null') as AppState;
}
