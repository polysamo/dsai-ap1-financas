import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { hojeISO } from '../domain/date';
import type { Desejo } from '../domain/desejos';
import type { AppState, Conta, Transacao } from '../domain/types';
import { construirEstado, renderizarApp } from './helpers';

const hoje = hojeISO();
const conta: Conta = { id: 'cc', nome: 'Corrente', tipo: 'corrente', saldoInicial: 3000000, arquivada: false, criadaEm: 1 };
const desejo = (p: Partial<Desejo> = {}): Desejo => ({ id: 'd1', nome: 'Fone', preco: 200000, prioridade: 'media', categoriaId: 'cat-lazer', criadoEm: '2026-01-01', esperarAte: '2026-01-01', situacao: 'ativo', ...p });
const despesa = (id: string, data: string): Transacao => ({ id, contaId: 'cc', categoriaId: 'cat-alimentacao', tipo: 'despesa', valor: 600000, data, descricao: '', criadaEm: 1 });
const meses = ['-1', '-2', '-3'].flatMap((n) => {
  const d = new Date();
  d.setMonth(d.getMonth() + Number(n), 5);
  const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return [despesa(`d${n}`, `${mes}-05`), { ...despesa(`r${n}`, `${mes}-05`), tipo: 'receita' as const, categoriaId: 'cat-salario', valor: 1000000 }];
});
const estado = (desejos: Desejo[] = [], transacoes: Transacao[] = []): AppState => construirEstado({ contas: [conta], desejos, transacoes });
const notificacoes = () => within(screen.getByRole('region', { name: 'Notificações' }));

describe('redesenho de Desejos', () => {
  it('critério 1: descrição ligada ao título e botão Novo desejo', () => {
    renderizarApp('/desejos', estado());
    expect(screen.getByRole('heading', { name: 'Lista de desejos', level: 1 })).toHaveAccessibleDescription(/cabe na reserva, no orçamento e na sobra do mês/);
    expect(screen.getByRole('button', { name: 'Novo desejo' })).toBeInTheDocument();
  });

  it('critério 2: o botão e a tecla n levam o foco ao primeiro campo do formulário', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/desejos', estado());
    const campo = screen.getByLabelText('O que você quer comprar');
    await usuario.click(screen.getByRole('button', { name: 'Novo desejo' }));
    expect(campo).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(campo).toHaveFocus();
  });

  it('critério 3: anotar e editar avisam com Desfazer', async () => {
    const usuario = userEvent.setup();
    const { store, unmount } = renderizarApp('/desejos', estado());
    const form = within(screen.getByRole('form', { name: 'Novo desejo' }));
    await usuario.type(form.getByLabelText('O que você quer comprar'), 'Bicicleta');
    await usuario.type(form.getByLabelText('Preço'), '1.200,00');
    await usuario.selectOptions(form.getByLabelText('Categoria'), 'cat-lazer');
    await usuario.click(form.getByRole('button', { name: 'Adicionar desejo' }));
    expect(notificacoes().getByText('Desejo anotado.')).toBeInTheDocument();
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.desejos).toHaveLength(0);

    unmount();
    const { store: s2 } = renderizarApp('/desejos', estado([desejo()]));
    await usuario.click(screen.getAllByRole('button', { name: 'Editar Fone' })[0]);
    const nome = screen.getByLabelText('O que você quer comprar');
    await usuario.clear(nome);
    await usuario.type(nome, 'Fone novo');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(notificacoes().getAllByText('Desejo atualizado.').length).toBeGreaterThan(0);
    expect(s2.getSnapshot().estado.desejos?.[0].nome).toBe('Fone novo');
  });

  it('critério 4: comprar avisa e um Desfazer remove a despesa e devolve o item aos ativos', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/desejos', estado([desejo()], meses));
    const antes = store.getSnapshot().estado.transacoes.length;
    await usuario.click(screen.getByRole('button', { name: 'Comprei Fone' }));
    await usuario.click(within(screen.getByRole('form', { name: 'Registrar compra' })).getByRole('button', { name: 'Confirmar compra' }));
    expect(notificacoes().getByText('Compra de Fone registrada como despesa.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.transacoes).toHaveLength(antes + 1);
    expect(store.getSnapshot().estado.desejos?.[0].situacao).toBe('comprado');
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(antes);
    expect(store.getSnapshot().estado.desejos?.[0].situacao).toBe('ativo');
  });

  it('critério 5: desistir e criar meta avisam com Desfazer', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/desejos', estado([desejo()]));
    await usuario.click(screen.getByRole('button', { name: 'Criar meta para Fone' }));
    expect(notificacoes().getByText('Meta "Fone" criada em Metas.')).toBeInTheDocument();
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.metas).toHaveLength(0);
    await usuario.click(screen.getByRole('button', { name: 'Desisti de Fone' }));
    expect(notificacoes().getByText(/Você desistiu de Fone: R\$\s2\.000,00 economizados\./)).toBeInTheDocument();
    expect(screen.getByTestId('economia')).toHaveTextContent('R$ 2.000,00');
    await usuario.click(notificacoes().getAllByRole('button', { name: 'Desfazer' }).pop()!);
    expect(store.getSnapshot().estado.desejos?.[0].situacao).toBe('ativo');
  });

  it('critério 6: excluir confirma, avisa e o Desfazer devolve o desejo', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/desejos', estado([desejo()]));
    await usuario.click(screen.getByRole('button', { name: 'Excluir Fone' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(notificacoes().getByText('Desejo excluído.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.desejos).toHaveLength(0);
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.desejos).toHaveLength(1);
  });

  it('critério 7: erro vira notificação alert que não some e não há alerta fixo', async () => {
    const usuario = userEvent.setup();
    const arquivada: Conta = { ...conta, id: 'arq', nome: 'Antiga', arquivada: true };
    const { store } = renderizarApp('/desejos', construirEstado({ contas: [conta, arquivada], desejos: [desejo()] }));
    // Ação sem formulário que falha: criar meta com nome longo demais.
    store.substituir({ ...store.getSnapshot().estado, desejos: [desejo({ nome: 'x'.repeat(41), preco: 0 })] });
    await usuario.click(await screen.findByRole('button', { name: /Criar meta para x+/ }));
    expect(notificacoes().getByRole('alert')).toBeInTheDocument();
    expect(document.querySelector('.desejos-pagina > .ds-alerta')).toBeNull();
  });

  it('critérios 8 e 9: selos de prioridade e veredito em texto', () => {
    renderizarApp('/desejos', estado([desejo({ id: 'a', nome: 'Alta', prioridade: 'alta' }), desejo({ id: 'b', nome: 'Baixa', prioridade: 'baixa', esperarAte: '2999-01-01' })], meses));
    const alta = within(screen.getByRole('article', { name: 'Alta' }));
    expect(alta.getByText('Prioridade alta')).toHaveClass('ds-selo--perigo');
    expect(alta.getByText('Pode comprar')).toHaveClass('ds-selo--sucesso');
    const baixa = within(screen.getByRole('article', { name: 'Baixa' }));
    expect(baixa.getByText('Prioridade baixa')).toHaveClass('ds-selo--neutro');
    expect(baixa.getByText(/^Espere mais \d+ dias$/)).toHaveClass('ds-selo--aviso');
    expect(baixa.getAllByText(/^(OK|Não):/)).toHaveLength(4);
  });

  it('critério 10: sem desejos, o botão do vazio leva o foco ao formulário', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/desejos', estado());
    expect(screen.getByText('Nenhum desejo anotado')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Anotar meu primeiro desejo' }));
    expect(screen.getByLabelText('O que você quer comprar')).toHaveFocus();
  });

  it('critério 11: os totais continuam iguais', () => {
    renderizarApp('/desejos', estado([desejo({ preco: 150000 }), desejo({ id: 'd2', nome: 'Outro', preco: 50000 }), desejo({ id: 'd3', nome: 'Desisti', preco: 70000, situacao: 'desistido', concluidoEm: hoje })]));
    expect(screen.getByTestId('total-ativos')).toHaveTextContent('R$ 2.000,00');
    expect(screen.getByTestId('economia')).toHaveTextContent('R$ 700,00');
  });
});
