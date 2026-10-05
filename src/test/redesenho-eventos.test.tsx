import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { hojeISO } from '../domain/date';
import type { Evento } from '../domain/eventos';
import type { AppState, Conta, Transacao } from '../domain/types';
import { construirEstado, renderizarApp } from './helpers';

const hoje = hojeISO();
const conta: Conta = { id: 'a', nome: 'Conta', tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1 };
const evento = (p: Partial<Evento> = {}): Evento => ({ id: 'ev', nome: 'Salvador', inicio: hoje, fim: hoje, orcamento: 500000, tag: 'salvador', criadoEm: 1, ...p });
const t = (id: string, p: Partial<Transacao> = {}): Transacao => ({ id, contaId: 'a', categoriaId: 'cat-alimentacao', tipo: 'despesa', valor: 10000, data: hoje, descricao: id, criadaEm: 1, tags: [], ...p });
const estado = (eventos: Evento[] = [], transacoes: Transacao[] = []): AppState => construirEstado({ contas: [conta], eventos, transacoes });
const notificacoes = () => within(screen.getByRole('region', { name: 'Notificações' }));

describe('redesenho de Eventos', () => {
  it('critério 1: descrição ligada ao título e botão Novo evento', () => {
    renderizarApp('/eventos', estado());
    expect(screen.getByRole('heading', { name: 'Eventos e viagens', level: 1 })).toHaveAccessibleDescription(/toda despesa com a tag do evento conta no orçamento dele/);
    expect(screen.getByRole('button', { name: 'Novo evento' })).toBeInTheDocument();
  });

  it('critério 2: o botão e a tecla n levam o foco ao campo Nome do evento', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/eventos', estado());
    const campo = screen.getByLabelText('Nome do evento');
    await usuario.click(screen.getByRole('button', { name: 'Novo evento' }));
    expect(campo).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(campo).toHaveFocus();
  });

  it('critério 3: criar e editar avisam, e Desfazer remove o evento criado', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/eventos', estado());
    const form = within(screen.getByRole('form', { name: 'Novo evento' }));
    await usuario.type(form.getByLabelText('Nome do evento'), 'Férias');
    await usuario.type(form.getByLabelText('Orçamento'), '1.000,00');
    await usuario.click(form.getByRole('button', { name: 'Criar evento' }));
    expect(notificacoes().getByText('Evento criado.')).toBeInTheDocument();
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.eventos).toHaveLength(0);
  });

  it('critério 3: editar mostra "Evento atualizado."', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/eventos', estado([evento()]));
    await usuario.click(screen.getByRole('button', { name: 'Editar evento' }));
    const orcamento = screen.getByLabelText('Orçamento');
    await usuario.clear(orcamento);
    await usuario.type(orcamento, '2.000,00');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(notificacoes().getByText('Evento atualizado.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.eventos?.[0].orcamento).toBe(200000);
  });

  it('critério 4: excluir confirma, avisa e o Desfazer devolve o evento', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/eventos', estado([evento()]));
    await usuario.click(screen.getByRole('button', { name: 'Excluir evento' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(notificacoes().getByText('Evento excluído. As transações e as tags continuam como estavam.')).toBeInTheDocument();
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.eventos).toHaveLength(1);
  });

  it('critério 5: etiquetar o período avisa com a mensagem do lote e o Desfazer remove as tags de uma vez', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/eventos', estado([evento()], [t('a'), t('b')]));
    await usuario.click(screen.getByRole('button', { name: 'Etiquetar despesas do período (2)' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Etiquetar' }));
    expect(notificacoes().getByText('2 transações etiquetadas.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.transacoes.every((x) => x.tags?.includes('salvador'))).toBe(true);
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.transacoes.every((x) => !x.tags?.includes('salvador'))).toBe(true);
  });

  it('critério 6: erro é notificação alert persistente e não há alerta fixo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/eventos', estado([evento()]));
    const form = within(screen.getByRole('form', { name: 'Novo evento' }));
    await usuario.type(form.getByLabelText('Nome do evento'), 'Outro');
    await usuario.type(form.getByLabelText('Orçamento'), '100,00');
    await usuario.clear(form.getByLabelText('Tag das despesas'));
    await usuario.type(form.getByLabelText('Tag das despesas'), 'salvador');
    await usuario.click(form.getByRole('button', { name: 'Criar evento' }));
    expect(form.getByRole('alert')).toHaveTextContent('Outro evento já usa essa tag.');
    expect(document.querySelector('.eventos-pagina > .ds-alerta')).toBeNull();
  });

  it('critérios 7 e 8: selo de situação em texto na lista e no detalhe', () => {
    renderizarApp('/eventos', estado([evento(), evento({ id: 'e2', nome: 'Festa', tag: 'festa', orcamento: 10000 })], [t('a', { tags: ['salvador'], valor: 450000 }), t('b', { tags: ['festa'], valor: 20000 })]));
    const lista = within(screen.getByRole('navigation', { name: 'Eventos' }));
    const salvador = lista.getByRole('button', { name: /Salvador/ });
    expect(within(salvador).getByText('Atenção')).toHaveClass('ds-selo--aviso');
    const festa = lista.getByRole('button', { name: /Festa/ });
    expect(within(festa).getByText('Estourado')).toHaveClass('ds-selo--perigo');
    expect(screen.getByTestId('evento-situacao')).toHaveTextContent('Atenção');
    expect(within(screen.getByTestId('evento-situacao')).getByText('Atenção')).toHaveClass('ds-selo--aviso');
  });

  it('critério 9: sem eventos, o botão do vazio leva o foco ao formulário', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/eventos', estado());
    expect(screen.getByText('Nenhum evento cadastrado')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Criar meu primeiro evento' }));
    expect(screen.getByLabelText('Nome do evento')).toHaveFocus();
  });

  it('critério 10: a seleção na lista marca aria-pressed e mostra os números do evento escolhido', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/eventos', estado([evento(), evento({ id: 'e2', nome: 'Festa', tag: 'festa', orcamento: 20000 })], [t('a', { tags: ['festa'], valor: 5000 })]));
    const festa = screen.getByRole('button', { name: /Festa/ });
    await usuario.click(festa);
    expect(festa).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('evento-gasto')).toHaveTextContent('R$ 50,00');
    expect(screen.getByTestId('evento-restante')).toHaveTextContent('R$ 150,00');
  });
});
