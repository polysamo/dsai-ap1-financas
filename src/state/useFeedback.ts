import { useCallback } from 'react';
import { useToast } from '../ds/Toast';
import type { AppState, Resultado } from '../domain/types';
import { useStore } from './store';

/**
 * Resultado das ações como notificação: sucesso (com "Desfazer" quando altera dados) ou erro que fica na tela.
 * `executar` aplica a operação pelo `Store` e devolve o resultado para a tela decidir o que fechar.
 */
export function useFeedback() {
  const store = useStore();
  const { mostrar } = useToast();

  const sucesso = useCallback((texto: string, desfazivel = false) => {
    mostrar(texto, {
      tipo: 'sucesso',
      ...(desfazivel
        ? {
            acao: {
              rotulo: 'Desfazer',
              aoClicar: () => {
                const r = store.desfazer();
                mostrar(r.ok ? `Desfeito: ${r.valor}` : r.erro, { tipo: r.ok ? 'info' : 'erro', duracao: r.ok ? undefined : 0 });
              },
            },
          }
        : {}),
    });
  }, [mostrar, store]);

  const erro = useCallback((texto: string) => mostrar(texto, { tipo: 'erro', duracao: 0 }), [mostrar]);

  const executar = useCallback(
    (operacao: (s: AppState) => Resultado<AppState>, mensagem?: string, desfazivel = true): Resultado<void> => {
      const r = store.aplicar(operacao);
      if (!r.ok) erro(r.erro);
      else if (mensagem) sucesso(mensagem, desfazivel);
      return r;
    },
    [store, erro, sucesso],
  );

  return { executar, sucesso, erro };
}
