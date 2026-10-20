import { describe, it, expect } from 'vitest';
import { sugerirCategoria } from '../domain/csv';
import { categoriasPadrao } from '../data/categoriasPadrao';
import { REGRAS_PADRAO } from '../data/regrasPadrao';
import casos from './casos-categorizacao.json';
import type { AppState, TipoMovimento } from '../domain/types';

/**
 * Estado de fábrica: categorias padrão, regras padrão, nenhuma transação.
 * Nenhuma transação é proposital — é o cenário de quem acabou de instalar o
 * app e importou o primeiro CSV. Sem histórico, só a regra decide.
 */
function estadoDeFabrica(): AppState {
  return {
    categorias: categoriasPadrao(),
    regras: REGRAS_PADRAO,
    transacoes: [],
  } as unknown as AppState;
}

type Caso = { descricao: string; tipo: TipoMovimento; esperado: string };
const lista = casos as Caso[];

describe('sugerirCategoria com as regras de fábrica', () => {
  const estado = estadoDeFabrica();

  it.each(lista)('$descricao -> $esperado', ({ descricao, tipo, esperado }) => {
    expect(sugerirCategoria(estado, descricao, tipo)).toBe(esperado);
  });
});

describe('integridade do conjunto de casos', () => {
  // Trava contra o verificador de fachada: se o agente puder apagar casos,
  // ele "resolve" tudo esvaziando o arquivo. Suba este número A MÃO, e só
  // para cima, quando você mesmo acrescentar casos novos.
  const MINIMO_DE_CASOS = 46;

  it('não perdeu casos', () => {
    expect(lista.length).toBeGreaterThanOrEqual(MINIMO_DE_CASOS);
  });

  it('não tem descrições duplicadas', () => {
    const vistos = new Set(lista.map((c) => `${c.tipo}|${c.descricao}`));
    expect(vistos.size).toBe(lista.length);
  });

  it('todo esperado aponta para uma categoria que existe', () => {
    const ids = new Set(categoriasPadrao().map((c: { id: string }) => c.id));
    const orfaos = lista.filter((c) => !ids.has(c.esperado)).map((c) => c.esperado);
    expect(orfaos).toEqual([]);
  });

  it('ainda há casos que devem cair em Outros', () => {
    // Impede que o agente resolva tudo com uma regra larga que casa com
    // qualquer coisa. Estes casos TÊM que continuar indo para "Outros".
    const emOutros = lista.filter((c) => c.esperado.startsWith('cat-outros'));
    expect(emOutros.length).toBeGreaterThanOrEqual(10);
  });
});
