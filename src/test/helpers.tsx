import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../App';
import { CHAVE_ESTADO, estadoInicial, salvar } from '../storage/storage';
import { Store, StoreProvider } from '../state/store';
import type { AppState } from '../domain/types';
import { marcarTourConcluido } from '../lib/onboarding';

/** Renderiza o app numa rota, opcionalmente com um estado pré-salvo no localStorage. */
export function renderizarApp(rota = '/', estado?: AppState, opcoes: { tour?: boolean } = {}) {
  if (!opcoes.tour) marcarTourConcluido(localStorage);
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

/** Estado inicial (com categorias padrão) sobrescrito por campos de teste. */
export function construirEstado(parcial: Partial<AppState> = {}): AppState {
  return { ...estadoInicial(), ...parcial };
}
