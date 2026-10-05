import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { hojeISO } from '../domain/date';
import type { Desafio, Desafio52, DesafioSemGastos, DesafioTeto } from '../domain/desafios';
import type { AppState } from '../domain/types';
import { construirEstado, renderizarApp } from './helpers';

const hoje = hojeISO();
const d52 = (p: Partial<Desafio52> = {}): Desafio52 => ({ id: 'd52', nome: '52 semanas', tipo: 'semanas52', inicio: hoje, criadoEm: 1, valorBase: 500, ordem: 'crescente', semanasFeitas: [], ...p });
const sg = (p: Partial<DesafioSemGastos> = {}): DesafioSemGastos => ({ id: 'sg', nome: 'Sem delivery', tipo: 'sem-gastos', inicio: hoje, criadoEm: 2, dias: 30, categoriaIds: ['cat-alimentacao'], ...p });
const teto = (p: Partial<DesafioTeto> = {}): DesafioTeto => ({ id: 'tt', nome: 'Lazer controlado', tipo: 'teto', inicio: hoje, criadoEm: 3, dias: 30, categoriaId: 'cat-lazer', limite: 30000, ...p });
const estado = (desafios: Desafio[] = []): AppState => construirEstado({ desafios });
const notificacoes = () => within(screen.getByRole('region', { name: 'Notificações' }));

describe('redesenho de Desafios', () => {
  it('critério 1: descrição ligada ao título e botão Novo desafio', () => {
    renderizarApp('/desafios', estado());
    expect(screen.getByRole('heading', { name: 'Desafios de economia', level: 1 })).toHaveAccessibleDescription(/criar o hábito de economizar/);
    expect(screen.getByRole('button', { name: 'Novo desafio' })).toBeInTheDocument();
  });

  it('critério 2: o botão e a tecla n levam o foco ao tipo de desafio', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/desafios', estado());
    const tipo = screen.getByLabelText('Tipo de desafio');
    await usuario.click(screen.getByRole('button', { name: 'Novo desafio' }));
    expect(tipo).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(tipo).toHaveFocus();
  });

  it('critério 3: criar avisa com Desfazer, que remove o desafio', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/desafios', estado());
    const form = within(screen.getByRole('form', { name: 'Novo desafio' }));
    await usuario.type(form.getByLabelText('Nome do desafio'), 'Sem iFood');
    await usuario.click(form.getByRole('checkbox', { name: 'Alimentação' }));
    await usuario.click(form.getByRole('button', { name: 'Começar desafio' }));
    expect(notificacoes().getByText('Desafio criado. Boa sorte!')).toBeInTheDocument();
    expect(store.getSnapshot().estado.desafios).toHaveLength(1);
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.desafios).toHaveLength(0);
  });

  it('critério 4: marcar e desmarcar uma semana avisam com o valor e o Desfazer restaura', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/desafios', estado([d52()]));
    await usuario.click(screen.getByRole('checkbox', { name: /^Semana 2,/ }));
    expect(notificacoes().getByText(/Semana 2 marcada: R\$\s10,00 guardados\./)).toBeInTheDocument();
    expect((store.getSnapshot().estado.desafios?.[0] as Desafio52).semanasFeitas).toEqual([2]);
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect((store.getSnapshot().estado.desafios?.[0] as Desafio52).semanasFeitas).toEqual([]);
    await usuario.click(screen.getByRole('checkbox', { name: /^Semana 2,/ }));
    await usuario.click(screen.getByRole('checkbox', { name: /^Semana 2,/ }));
    expect(notificacoes().getByText('Semana 2 desmarcada.')).toBeInTheDocument();
  });

  it('critério 5: abandonar e excluir confirmam, avisam e permitem desfazer', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/desafios', estado([sg()]));
    await usuario.click(screen.getByRole('button', { name: 'Abandonar Sem delivery' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Abandonar' }));
    expect(notificacoes().getByText('Desafio abandonado.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.desafios?.[0].abandonadoEm).toBe(hoje);
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.desafios?.[0].abandonadoEm).toBeUndefined();
    await usuario.click(screen.getByRole('button', { name: 'Excluir Sem delivery' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(notificacoes().getByText('Desafio excluído.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.desafios).toHaveLength(0);
  });

  it('critério 6: erro de validação fica junto ao campo, sem alerta fixo no topo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/desafios', estado());
    const form = within(screen.getByRole('form', { name: 'Novo desafio' }));
    await usuario.click(form.getByRole('button', { name: 'Começar desafio' }));
    expect(form.getByRole('alert')).toBeInTheDocument();
    expect(document.querySelector('.desafios-pagina > .ds-alerta')).toBeNull();
  });

  it('critério 7: selos de situação em texto com tom por situação', () => {
    renderizarApp('/desafios', estado([sg(), sg({ id: 'f', nome: 'Futuro', inicio: '2999-01-01' }), teto({ inicio: '2020-01-01', dias: 10 }), sg({ id: 'ab', nome: 'Largado', abandonadoEm: hoje })]));
    expect(within(screen.getByRole('article', { name: 'Sem delivery' })).getByText('Em andamento')).toHaveClass('ds-selo--info');
    expect(within(screen.getByRole('article', { name: 'Futuro' })).getByText('Ainda não começou')).toHaveClass('ds-selo--neutro');
    expect(within(screen.getByRole('article', { name: 'Lazer controlado' })).getByText('Concluído')).toHaveClass('ds-selo--sucesso');
    expect(within(screen.getByRole('article', { name: 'Largado' })).getByText('Abandonado')).toBeInTheDocument();
  });

  it('critério 8: a barra do teto diz Atenção e Estourado em texto', () => {
    const gasto = (valor: number) => ({ id: 'g', contaId: 'a', categoriaId: 'cat-lazer', tipo: 'despesa' as const, valor, data: hoje, descricao: '', criadaEm: 1 });
    const { unmount } = renderizarApp('/desafios', { ...estado([teto()]), transacoes: [gasto(25000)] });
    const barra = screen.getByRole('progressbar', { name: 'Consumo do teto de Lazer controlado' });
    expect(barra).toHaveAttribute('aria-valuenow', '83');
    expect(screen.getByText('Atenção')).toBeInTheDocument();
    unmount();
    renderizarApp('/desafios', { ...estado([teto()]), transacoes: [gasto(40000)] });
    expect(screen.getByText('Estourado')).toBeInTheDocument();
  });

  it('critério 9: sem desafios, o botão do vazio leva o foco ao formulário', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/desafios', estado());
    expect(screen.getByText('Nenhum desafio ainda')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Criar meu primeiro desafio' }));
    expect(screen.getByLabelText('Tipo de desafio')).toHaveFocus();
  });

  it('critério 10: seções Ativos e Encerrados continuam separadas', () => {
    renderizarApp('/desafios', estado([sg(), sg({ id: 'ab', nome: 'Largado', abandonadoEm: hoje })]));
    expect(within(screen.getByRole('region', { name: 'Ativos' })).getByRole('article', { name: 'Sem delivery' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Encerrados' })).getByRole('article', { name: 'Largado' })).toBeInTheDocument();
  });
});
