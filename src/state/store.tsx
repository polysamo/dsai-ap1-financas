import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { apagarTudo, carregar, estadoInicial, salvar } from '../storage/storage';
import { falha, ok, type AppState, type Resultado } from '../domain/types';
import { desfazer, historicoVazio, refazer, registrar, type Historico, type Passo } from '../domain/historico';

export type Problema =
  | { tipo: 'corrompido'; bruto: string }
  | { tipo: 'versao-futura'; bruto: string; versao: number };

export interface Snapshot {
  estado: AppState;
  problema: Problema | null;
  historico: Historico;
}

const MSG_GRAVACAO =
  'Não foi possível gravar no navegador (armazenamento cheio ou bloqueado). Nada foi alterado.';

/**
 * Guarda o estado em memória e o persiste no storage a cada alteração.
 * Se a gravação falhar, o estado em memória não muda.
 */
export class Store {
  private snap: Snapshot;
  private ouvintes = new Set<() => void>();

  constructor(private readonly storage: Storage) {
    const carga = carregar(storage);
    this.snap =
      carga.tipo === 'ok'
        ? { estado: carga.estado, problema: null, historico: historicoVazio() }
        : { estado: estadoInicial(), problema: carga, historico: historicoVazio() };
  }

  getSnapshot = (): Snapshot => this.snap;

  subscribe = (ouvinte: () => void): (() => void) => {
    this.ouvintes.add(ouvinte);
    return () => {
      this.ouvintes.delete(ouvinte);
    };
  };

  /** Aplica uma operação pura sobre o estado; só persiste se ela der certo. */
  aplicar = (operacao: (estado: AppState) => Resultado<AppState>): Resultado<void> => {
    if (this.snap.problema) return falha('Os dados salvos não foram carregados; resolva isso antes de continuar.');
    const antes = this.snap.estado;
    const r = operacao(antes);
    if (!r.ok) return r;
    if (r.valor === antes) return ok(undefined);
    return this.gravar(r.valor, registrar(this.snap.historico, antes, r.valor));
  };

  /** Volta a última operação; devolve a descrição do que foi desfeito. */
  desfazer = (): Resultado<string> => this.passo(desfazer(this.snap.historico, this.snap.estado), 'Nada para desfazer.');

  /** Reaplica a última operação desfeita. */
  refazer = (): Resultado<string> => this.passo(refazer(this.snap.historico, this.snap.estado), 'Nada para refazer.');

  /** Troca todo o estado (importação, exemplo, recomeço), inclusive resolvendo um problema de carga. */
  substituir = (estado: AppState): Resultado<void> => this.gravar(estado, historicoVazio());

  iniciarVazio = (): Resultado<void> => this.gravar(estadoInicial(), historicoVazio());

  /** Remove todas as chaves do app e volta ao primeiro uso. */
  apagarTudo = (): void => {
    apagarTudo(this.storage);
    this.snap = { estado: estadoInicial(), problema: null, historico: historicoVazio() };
    this.emitir();
  };

  private passo(p: Passo | null, vazio: string): Resultado<string> {
    if (this.snap.problema) return falha('Os dados salvos não foram carregados; resolva isso antes de continuar.');
    if (!p) return falha(vazio);
    const r = this.gravar(p.estado, p.historico);
    return r.ok ? ok(p.descricao) : r;
  }

  private gravar(estado: AppState, historico: Historico): Resultado<void> {
    try {
      salvar(estado, this.storage);
    } catch {
      return falha(MSG_GRAVACAO);
    }
    this.snap = { estado, problema: null, historico };
    this.emitir();
    return ok(undefined);
  }

  private emitir(): void {
    this.ouvintes.forEach((o) => o());
  }
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ store, children }: { store: Store; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore precisa estar dentro de StoreProvider');
  return store;
}

export function useSnapshot(): Snapshot {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function useEstado(): AppState {
  return useSnapshot().estado;
}
