import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { gerarExemplo } from '../data/exemplo';
import { formatarData, dataValida, somarMeses } from '../domain/date';
import { formatarMoeda, parseValor } from '../domain/money';
import { CHAVE_ESTADO, PREFIXO, SCHEMA_ATUAL, carregar, estadoInicial, exportarJson, importarJson, salvar } from '../storage/storage';
import { Store } from '../state/store';
import { lerEstadoSalvo, renderizarApp } from './helpers';

describe('visão geral: dinheiro e datas (critérios 5 e 6)', () => {
  it('soma em centavos sem erro de ponto flutuante', () => {
    expect(parseValor('0,10')! + parseValor('0,20')!).toBe(30);
  });

  it('converte formatos brasileiro e internacional para centavos', () => {
    expect(parseValor('1.234,56')).toBe(123456);
    expect(parseValor('-50,00')).toBe(-5000);
    expect(parseValor('1234.56')).toBe(123456);
    expect(parseValor('R$ 10')).toBe(1000);
    expect(parseValor('1.234')).toBe(123400);
    expect(parseValor('abc')).toBeNull();
    expect(parseValor('1,234')).toBeNull();
    expect(parseValor('')).toBeNull();
  });

  it('formata moeda como R$ 1.234,56 e data como dd/mm/aaaa', () => {
    expect(formatarMoeda(123456)).toBe('R$ 1.234,56');
    expect(formatarMoeda(-5000)).toBe('-R$ 50,00');
    expect(formatarData('2026-10-01')).toBe('01/10/2026');
  });

  it('rejeita datas inexistentes e soma meses atravessando o ano', () => {
    expect(dataValida('2026-02-31')).toBe(false);
    expect(dataValida('2028-02-29')).toBe(true);
    expect(somarMeses('2026-11', 3)).toBe('2027-02');
    expect(somarMeses('2026-01', -1)).toBe('2025-12');
  });
});

describe('visão geral: persistência (critérios 2, 3 e 4)', () => {
  it('só escreve chaves com o prefixo do app', () => {
    const store = new Store(localStorage);
    store.substituir(gerarExemplo('2026-10-01'));
    const chaves = Object.keys(localStorage);
    expect(chaves.length).toBeGreaterThan(0);
    expect(chaves.every((c) => c.startsWith(PREFIXO))).toBe(true);
  });

  it('grava schemaVersion e recarrega o mesmo estado', () => {
    const estado = gerarExemplo('2026-10-01');
    salvar(estado, localStorage);
    expect(lerEstadoSalvo().schemaVersion).toBe(SCHEMA_ATUAL);
    const carga = carregar(localStorage);
    expect(carga.tipo === 'ok' && carga.estado.transacoes.length).toBe(estado.transacoes.length);
  });

  it('migra um estado sem versão (v0) para a versão atual', () => {
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify({ contas: [{ id: 'a' }], transacoes: [] }));
    const carga = carregar(localStorage);
    expect(carga.tipo).toBe('ok');
    if (carga.tipo === 'ok') {
      expect(carga.estado.schemaVersion).toBe(SCHEMA_ATUAL);
      expect(carga.estado.contas).toHaveLength(1);
      expect(carga.estado.metas).toEqual([]);
    }
  });

  it('com versão maior que a conhecida, mostra aviso e não sobrescreve os dados', async () => {
    const bruto = JSON.stringify({ schemaVersion: SCHEMA_ATUAL + 5, coisa: 'futuro' });
    localStorage.setItem(CHAVE_ESTADO, bruto);
    renderizarApp('/configuracoes');
    expect(screen.getByText(/versão mais nova do app/i)).toBeInTheDocument();
    expect(localStorage.getItem(CHAVE_ESTADO)).toBe(bruto);
  });

  it('com JSON corrompido, não quebra, oferece exportar o bruto e só então recomeçar', async () => {
    const usuario = userEvent.setup();
    localStorage.setItem(CHAVE_ESTADO, '{nao e json');
    const { store } = renderizarApp('/configuracoes');
    expect(screen.getByText(/estão corrompidos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar conteúdo bruto' })).toBeInTheDocument();
    expect(localStorage.getItem(CHAVE_ESTADO)).toBe('{nao e json');
    await usuario.click(screen.getByRole('button', { name: 'Começar do zero' }));
    const dialogo = screen.getByRole('dialog');
    const confirmar = within(dialogo).getByRole('button', { name: 'Começar do zero' });
    expect(confirmar).toBeDisabled();
    await usuario.type(within(dialogo).getByLabelText(/Digite APAGAR/), 'APAGAR');
    await usuario.click(confirmar);
    expect(store.getSnapshot().problema).toBeNull();
    expect(carregar(localStorage).tipo).toBe('ok');
  });

  it('falha de gravação não altera o estado em memória', () => {
    const store = new Store(localStorage);
    const original = store.getSnapshot().estado;
    const espiao = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cota', 'QuotaExceededError');
    });
    const r = store.aplicar((s) => ({ ok: true, valor: { ...s, contas: [{ id: 'x', nome: 'X', tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1 }] } }));
    espiao.mockRestore();
    expect(r.ok).toBe(false);
    expect(store.getSnapshot().estado).toBe(original);
  });
});

describe('visão geral: exportar, importar e apagar (critérios 7 e 8)', () => {
  it('exporta e reimporta o mesmo conteúdo', () => {
    const estado = gerarExemplo('2026-10-01');
    const r = importarJson(exportarJson(estado));
    expect(r.ok && r.valor).toEqual(estado);
  });

  it('recusa arquivo inválido ou de versão futura', () => {
    expect(importarJson('nao json').ok).toBe(false);
    expect(importarJson('{"foo":1}').ok).toBe(false);
    expect(importarJson(JSON.stringify({ schemaVersion: 99 })).ok).toBe(false);
  });

  it('importar pede confirmação e substitui o conteúdo atual', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/configuracoes', gerarExemplo('2026-10-01'));
    const outro = estadoInicial();
    outro.contas.push({ id: 'z', nome: 'Importada', tipo: 'corrente', saldoInicial: 100, arquivada: false, criadaEm: 1 });
    const arquivo = new File([exportarJson(outro)], 'dados.json', { type: 'application/json' });
    await usuario.upload(screen.getByLabelText('Arquivo de dados para importar'), arquivo);
    await usuario.click(await screen.findByRole('button', { name: 'Substituir e importar' }));
    await waitFor(() => expect(store.getSnapshot().estado.contas.map((c) => c.nome)).toEqual(['Importada']));
  });

  it('apagar tudo exige digitar APAGAR e volta ao primeiro uso', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/configuracoes', gerarExemplo('2026-10-01'));
    await usuario.click(screen.getByRole('button', { name: 'Apagar todos os dados' }));
    const dialogo = screen.getByRole('dialog');
    const confirmar = within(dialogo).getByRole('button', { name: 'Apagar tudo' });
    expect(confirmar).toBeDisabled();
    await usuario.type(within(dialogo).getByLabelText(/Digite APAGAR/), 'APAGAR');
    await usuario.click(confirmar);
    expect(store.getSnapshot().estado.contas).toHaveLength(0);
    expect(Object.keys(localStorage).filter((c) => c.startsWith(PREFIXO))).toHaveLength(0);
  });
});

describe('visão geral: execução (critérios 1, 9, 10 e 11)', () => {
  it('não faz requisições de rede ao renderizar', () => {
    const fetchEspiao = vi.fn();
    vi.stubGlobal('fetch', fetchEspiao);
    renderizarApp('/configuracoes');
    vi.unstubAllGlobals();
    expect(fetchEspiao).not.toHaveBeenCalled();
  });

  it('primeiro uso não gera erros no console', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderizarApp('/configuracoes');
    expect(erro).not.toHaveBeenCalled();
    erro.mockRestore();
  });

  it('a navegação tem landmark rotulado e os controles têm rótulo acessível', () => {
    renderizarApp('/configuracoes');
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByLabelText('Arquivo de dados para importar')).toBeInTheDocument();
    for (const botao of screen.getAllByRole('button')) {
      expect(botao).toHaveAccessibleName();
    }
  });

  it('o cabeçalho quebra linha e a página não rola na horizontal em telas estreitas', () => {
    const { container } = renderizarApp('/configuracoes');
    expect(container.querySelector('nav')?.className).toContain('layout-nav');
    expect(container.firstElementChild?.className).toContain('layout-raiz');
  });

  it('carregar dados de exemplo preenche o estado', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/configuracoes');
    await usuario.click(screen.getByRole('button', { name: 'Carregar dados de exemplo' }));
    expect(store.getSnapshot().estado.contas.length).toBeGreaterThan(0);
    expect(store.getSnapshot().estado.transacoes.length).toBeGreaterThan(20);
  });
});
