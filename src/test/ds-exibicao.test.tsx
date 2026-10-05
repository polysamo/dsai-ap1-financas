import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Accordion } from '../ds/Accordion';
import { Avatar, iniciais } from '../ds/Avatar';
import { Badge } from '../ds/Badge';
import { Breadcrumb } from '../ds/Breadcrumb';
import { Card } from '../ds/Card';
import { Chip } from '../ds/Chip';
import { DataList } from '../ds/DataList';
import { EmptyState } from '../ds/EmptyState';
import { ErrorState } from '../ds/ErrorState';
import { Pagination, janelaDePaginas } from '../ds/Pagination';
import { ProgressBar, estadoProgresso } from '../ds/ProgressBar';
import { ProgressRing } from '../ds/ProgressRing';
import { Skeleton } from '../ds/Skeleton';
import { Stepper } from '../ds/Stepper';
import { Table, type Coluna } from '../ds/Table';
import { Tabs } from '../ds/Tabs';

describe('ds: Tabs', () => {
  const abas = [
    { id: 'a', rotulo: 'Resumo', conteudo: <p>Painel A</p> },
    { id: 'b', rotulo: 'Detalhes', conteudo: <p>Painel B</p> },
    { id: 'c', rotulo: 'Histórico', conteudo: <p>Painel C</p> },
  ];

  it('liga abas e painéis por aria e mostra só o painel ativo', () => {
    render(<Tabs abas={abas} rotulo="Seções" />);
    expect(screen.getByRole('tablist', { name: 'Seções' })).toBeInTheDocument();
    const aba = screen.getByRole('tab', { name: 'Resumo' });
    expect(aba).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', aba.id);
    expect(aba).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
    expect(screen.queryByText('Painel B')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Detalhes' })).toHaveAttribute('tabindex', '-1');
  });

  it('setas, Home e End trocam de aba e movem o foco', async () => {
    render(<Tabs abas={abas} rotulo="Seções" />);
    screen.getByRole('tab', { name: 'Resumo' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Detalhes' })).toHaveFocus();
    expect(screen.getByText('Painel B')).toBeInTheDocument();
    await userEvent.keyboard('{End}');
    expect(screen.getByText('Painel C')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Histórico' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveFocus();
  });

  it('modo controlado avisa a mudança e respeita o valor recebido', async () => {
    const aoMudar = vi.fn();
    render(<Tabs abas={abas} rotulo="Seções" valor="b" aoMudar={aoMudar} />);
    expect(screen.getByText('Painel B')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(aoMudar).toHaveBeenCalledWith('c');
    expect(screen.getByText('Painel B')).toBeInTheDocument();
  });
});

describe('ds: Accordion', () => {
  const itens = [
    { id: 'a', titulo: 'Primeiro', conteudo: 'Texto 1' },
    { id: 'b', titulo: 'Segundo', conteudo: 'Texto 2' },
  ];

  it('abre e fecha com aria-expanded e região ligada ao botão', async () => {
    render(<Accordion itens={itens} />);
    const botao = screen.getByRole('button', { name: /Primeiro/ });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: /Primeiro/ })).toHaveTextContent('Texto 1');
    await userEvent.click(botao);
    expect(screen.queryByText('Texto 1')).not.toBeInTheDocument();
  });

  it('sem múltiplo abre um por vez; com múltiplo mantém vários; teclado Enter e Espaço', async () => {
    const { unmount } = render(<Accordion itens={itens} />);
    await userEvent.click(screen.getByRole('button', { name: /Primeiro/ }));
    await userEvent.click(screen.getByRole('button', { name: /Segundo/ }));
    expect(screen.queryByText('Texto 1')).not.toBeInTheDocument();
    expect(screen.getByText('Texto 2')).toBeInTheDocument();
    unmount();
    render(<Accordion itens={itens} multiplo abertosIniciais={['a']} />);
    expect(screen.getByText('Texto 1')).toBeInTheDocument();
    screen.getByRole('button', { name: /Segundo/ }).focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('Texto 1')).toBeInTheDocument();
    expect(screen.getByText('Texto 2')).toBeInTheDocument();
    await userEvent.keyboard(' ');
    expect(screen.queryByText('Texto 2')).not.toBeInTheDocument();
  });
});

describe('ds: Breadcrumb, Pagination e Stepper', () => {
  it('Breadcrumb: último item é a página atual e os anteriores são links', () => {
    render(
      <MemoryRouter>
        <Breadcrumb itens={[{ rotulo: 'Início', to: '/' }, { rotulo: 'Contas', to: '/contas' }, { rotulo: 'Nubank' }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('navigation', { name: 'Você está em' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contas' })).toHaveAttribute('href', '/contas');
    expect(screen.getByText('Nubank')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Nubank' })).not.toBeInTheDocument();
  });

  it('janelaDePaginas mostra extremos e vizinhas com reticências', () => {
    expect(janelaDePaginas(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(janelaDePaginas(1, 20)).toEqual([1, 2, null, 20]);
    expect(janelaDePaginas(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(janelaDePaginas(20, 20)).toEqual([1, null, 19, 20]);
  });

  it('Pagination: aria-current, anterior e próxima desabilitadas nos extremos e troca de página', async () => {
    function Exemplo() {
      const [p, setP] = useState(1);
      return <Pagination pagina={p} totalPaginas={3} onChange={setP} />;
    }
    render(<Exemplo />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Página 3' }));
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('Pagination com uma página só não renderiza nada', () => {
    const { container } = render(<Pagination pagina={1} totalPaginas={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Stepper diz a situação de cada etapa em texto e marca a atual', () => {
    render(<Stepper atual={1} etapas={[{ rotulo: 'Arquivo' }, { rotulo: 'Colunas', descricao: 'Mapear' }, { rotulo: 'Revisão' }]} />);
    const itens = screen.getAllByRole('listitem');
    expect(itens[0]).toHaveTextContent('Concluída');
    expect(itens[1]).toHaveTextContent('Etapa atual');
    expect(itens[1]).toHaveAttribute('aria-current', 'step');
    expect(itens[2]).toHaveTextContent('Pendente');
  });
});

describe('ds: Badge, Chip, Avatar, Card e DataList', () => {
  it('Badge aplica o tom', () => {
    render(<Badge tom="sucesso">Pago</Badge>);
    expect(screen.getByText('Pago')).toHaveClass('ds-selo--sucesso');
  });

  it('Chip só tem botão remover quando há callback', async () => {
    const remover = vi.fn();
    const { rerender } = render(<Chip rotulo="viagem" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<Chip rotulo="viagem" aoRemover={remover} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover viagem' }));
    expect(remover).toHaveBeenCalledTimes(1);
  });

  it('Avatar usa iniciais com nome acessível, ou imagem com alt', () => {
    expect([iniciais('Polyana dos Santos Moraes'), iniciais('antonio'), iniciais('  '), iniciais('ana  lima')]).toEqual(['PM', 'A', '?', 'AL']);
    const { rerender } = render(<Avatar nome="Antonio Roger" />);
    expect(screen.getByRole('img', { name: 'Antonio Roger' })).toHaveTextContent('AR');
    rerender(<Avatar nome="Antonio Roger" src="/a.png" tamanho="grande" />);
    expect(screen.getByRole('img', { name: 'Antonio Roger' })).toHaveAttribute('src', '/a.png');
  });

  it('Card mostra título, ações e rodapé', () => {
    render(<Card titulo="Resumo" acoes={<button>Editar</button>} rodape="Atualizado hoje">Corpo</Card>);
    expect(screen.getByRole('heading', { name: 'Resumo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByText('Atualizado hoje')).toBeInTheDocument();
  });

  it('DataList usa dl, dt e dd', () => {
    render(<DataList colunas itens={[{ rotulo: 'Total', valor: 'R$ 10,00' }, { rotulo: 'Compras', valor: 3 }]} />);
    const termos = screen.getAllByRole('term');
    expect(termos.map((t) => t.textContent)).toEqual(['Total', 'Compras']);
    expect(screen.getAllByRole('definition').map((d) => d.textContent)).toEqual(['R$ 10,00', '3']);
  });
});

describe('ds: ProgressBar, ProgressRing e Skeleton', () => {
  it('estadoProgresso: ok, atenção a partir de 80% e estourado acima do limite', () => {
    expect([estadoProgresso(79, 100), estadoProgresso(80, 100), estadoProgresso(100, 100), estadoProgresso(101, 100), estadoProgresso(5, 0)]).toEqual(['ok', 'atencao', 'atencao', 'estourado', 'ok']);
  });

  it('ProgressBar expõe valor 0 a 100 e diz o estado em texto', () => {
    const { rerender } = render(<ProgressBar valor={85} max={100} rotulo="Orçamento" />);
    const barra = screen.getByRole('progressbar', { name: 'Orçamento' });
    expect(barra).toHaveAttribute('aria-valuenow', '85');
    expect(screen.getByText('Atenção')).toBeInTheDocument();
    rerender(<ProgressBar valor={250} max={100} rotulo="Orçamento" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('Estourado')).toBeInTheDocument();
    rerender(<ProgressBar valor={10} max={100} rotulo="Orçamento" mostrarEstado={false} />);
    expect(screen.queryByText('Dentro do limite')).not.toBeInTheDocument();
  });

  it('ProgressRing mostra a porcentagem e limita entre 0 e 100', () => {
    const { rerender } = render(<ProgressRing valor={1} max={4} rotulo="Meta" />);
    expect(screen.getByRole('progressbar', { name: 'Meta' })).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('25%')).toBeInTheDocument();
    rerender(<ProgressRing valor={9} max={4} rotulo="Meta" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    rerender(<ProgressRing valor={-3} max={0} rotulo="Meta" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('Skeleton é decorativo e desenha o número de linhas pedido', () => {
    const { container } = render(<Skeleton linhas={3} />);
    expect(container.querySelectorAll('.ds-esqueleto--texto')).toHaveLength(3);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    const { container: bloco } = render(<Skeleton variante="bloco" altura="10rem" />);
    expect(bloco.firstElementChild?.getAttribute('style')).toContain('height: 10rem');
  });
});

describe('ds: EmptyState e ErrorState', () => {
  it('EmptyState mostra ilustração SVG decorativa, texto e chamada para ação', () => {
    const { container } = render(<EmptyState titulo="Nada aqui" acao={<button>Criar</button>}>Comece criando um item.</EmptyState>);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
    expect(screen.getByText('Comece criando um item.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument();
  });

  it('ErrorState usa alert e só mostra "Tentar de novo" com callback', async () => {
    const tentar = vi.fn();
    const { rerender } = render(<ErrorState>Sem conexão.</ErrorState>);
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<ErrorState titulo="Falha ao carregar" aoTentarNovamente={tentar}>Sem conexão.</ErrorState>);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(tentar).toHaveBeenCalledTimes(1);
  });
});

describe('ds: Table', () => {
  interface Linha {
    id: string;
    nome: string;
    valor: number;
  }
  const dados: Linha[] = [
    { id: '1', nome: 'Café', valor: 1500 },
    { id: '2', nome: 'Aluguel', valor: 120000 },
    { id: '3', nome: 'Mercado', valor: 25000 },
  ];
  const colunas: Coluna<Linha>[] = [
    { id: 'nome', titulo: 'Nome', celula: (l) => l.nome, valor: (l) => l.nome },
    { id: 'valor', titulo: 'Valor', celula: (l) => `R$ ${l.valor / 100}`, valor: (l) => l.valor, alinhar: 'direita' },
    { id: 'acoes', titulo: 'Ações', celula: () => '…' },
  ];
  const nomes = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);

  it('tem legenda, cabeçalhos de coluna e rótulos para a versão em cartões', () => {
    render(<Table colunas={colunas} linhas={dados} chave={(l) => l.id} legenda="Gastos do mês" />);
    expect(screen.getByRole('table', { name: 'Gastos do mês' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getAllByRole('cell')[1]).toHaveAttribute('data-rotulo', 'Valor');
  });

  it('ordena por coluna alternando crescente e decrescente com aria-sort', async () => {
    render(<Table colunas={colunas} linhas={dados} chave={(l) => l.id} legenda="t" />);
    const cabecalho = screen.getByRole('columnheader', { name: /Nome/ });
    expect(cabecalho).toHaveAttribute('aria-sort', 'none');
    await userEvent.click(within(cabecalho).getByRole('button'));
    expect(cabecalho).toHaveAttribute('aria-sort', 'ascending');
    expect(nomes()).toEqual(['Aluguel', 'Café', 'Mercado']);
    await userEvent.click(within(cabecalho).getByRole('button'));
    expect(cabecalho).toHaveAttribute('aria-sort', 'descending');
    expect(nomes()).toEqual(['Mercado', 'Café', 'Aluguel']);
    await userEvent.click(within(screen.getByRole('columnheader', { name: /Valor/ })).getByRole('button'));
    expect(nomes()).toEqual(['Café', 'Mercado', 'Aluguel']);
    expect(screen.getByRole('columnheader', { name: 'Ações' })).not.toHaveAttribute('aria-sort');
  });

  it('ordenação inicial aplicada e coluna sem valor não vira botão', () => {
    render(<Table colunas={colunas} linhas={dados} chave={(l) => l.id} legenda="t" ordenacaoInicial={{ coluna: 'valor', direcao: 'desc' }} />);
    expect(nomes()).toEqual(['Aluguel', 'Mercado', 'Café']);
    expect(within(screen.getByRole('columnheader', { name: 'Ações' })).queryByRole('button')).not.toBeInTheDocument();
  });

  it('seleção: marcar linha, selecionar todas e desmarcar', async () => {
    function Exemplo() {
      const [sel, setSel] = useState<Set<string>>(new Set());
      return (
        <>
          <Table colunas={colunas} linhas={dados} chave={(l) => l.id} legenda="t" selecionadas={sel} aoSelecionar={setSel} rotuloSelecao={(l) => `Selecionar ${l.nome}`} />
          <output data-testid="n">{sel.size}</output>
        </>
      );
    }
    render(<Exemplo />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Café' }));
    expect(screen.getByTestId('n')).toHaveTextContent('1');
    expect(screen.getByRole('row', { name: /Café/ })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar todas as linhas' }));
    expect(screen.getByTestId('n')).toHaveTextContent('3');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar todas as linhas' }));
    expect(screen.getByTestId('n')).toHaveTextContent('0');
  });

  it('paginação mostra só a página atual e troca de página', async () => {
    const muitas = Array.from({ length: 7 }, (_, i) => ({ id: String(i), nome: `Item ${i + 1}`, valor: i }));
    render(<Table colunas={colunas} linhas={muitas} chave={(l) => l.id} legenda="t" tamanhoPagina={3} />);
    expect(nomes()).toEqual(['Item 1', 'Item 2', 'Item 3']);
    await userEvent.click(screen.getByRole('button', { name: 'Página 3' }));
    expect(nomes()).toEqual(['Item 7']);
  });

  it('sem linhas mostra o estado vazio recebido', () => {
    render(<Table colunas={colunas} linhas={[]} chave={(l) => l.id} legenda="t" vazio={<p>Nenhum gasto</p>} />);
    expect(screen.getByText('Nenhum gasto')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
