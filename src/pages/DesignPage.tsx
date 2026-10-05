import { useState, type ReactNode } from 'react';
import { Accordion } from '../ds/Accordion';
import { Alert } from '../ds/Alert';
import { Avatar } from '../ds/Avatar';
import { Badge, type TomBadge } from '../ds/Badge';
import { Banner } from '../ds/Banner';
import { Breadcrumb } from '../ds/Breadcrumb';
import { Button, type VarianteBotao } from '../ds/Button';
import { Card } from '../ds/Card';
import { Checkbox } from '../ds/Checkbox';
import { Chip } from '../ds/Chip';
import { Combobox } from '../ds/Combobox';
import { ConfirmDialog } from '../ds/ConfirmDialog';
import { CurrencyInput } from '../ds/CurrencyInput';
import { DataList } from '../ds/DataList';
import { DatePicker } from '../ds/DatePicker';
import { DateRangePicker, type Intervalo } from '../ds/DateRangePicker';
import { Drawer } from '../ds/Drawer';
import { Dropdown } from '../ds/Dropdown';
import { EmptyState } from '../ds/EmptyState';
import { ErrorState } from '../ds/ErrorState';
import { IconButton } from '../ds/IconButton';
import { Input } from '../ds/Input';
import { Modal } from '../ds/Modal';
import { Pagination } from '../ds/Pagination';
import { Popover } from '../ds/Popover';
import { ProgressBar } from '../ds/ProgressBar';
import { ProgressRing } from '../ds/ProgressRing';
import { RadioGroup } from '../ds/Radio';
import { SearchInput } from '../ds/SearchInput';
import { Select } from '../ds/Select';
import { Skeleton } from '../ds/Skeleton';
import { Slider } from '../ds/Slider';
import { Spinner } from '../ds/Spinner';
import { Stepper } from '../ds/Stepper';
import { Switch } from '../ds/Switch';
import { Table, type Coluna } from '../ds/Table';
import { Tabs } from '../ds/Tabs';
import { Textarea } from '../ds/Textarea';
import { useToast } from '../ds/Toast';
import { Tooltip } from '../ds/Tooltip';
import { formatarMoeda } from '../domain/money';
import { TituloPagina } from '../components/ui';
import { usePreferencias } from '../state/preferencias';
import './DesignPage.css';

const VARIANTES: VarianteBotao[] = ['primario', 'secundario', 'perigo', 'fantasma', 'link'];
const TONS: TomBadge[] = ['neutro', 'primario', 'sucesso', 'aviso', 'perigo', 'info'];
const ESCALAS = ['neutra', 'primaria', 'sucesso', 'aviso', 'perigo', 'info'] as const;
const PASSOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

interface Gasto {
  id: string;
  nome: string;
  valor: number;
}
const GASTOS: Gasto[] = [
  { id: '1', nome: 'Aluguel', valor: 120000 },
  { id: '2', nome: 'Mercado', valor: 45000 },
  { id: '3', nome: 'Transporte', valor: 18000 },
  { id: '4', nome: 'Lazer', valor: 9000 },
  { id: '5', nome: 'Saúde', valor: 22000 },
];
const COLUNAS: Coluna<Gasto>[] = [
  { id: 'nome', titulo: 'Categoria', celula: (g) => g.nome, valor: (g) => g.nome },
  { id: 'valor', titulo: 'Valor', celula: (g) => formatarMoeda(g.valor), valor: (g) => g.valor, alinhar: 'direita' },
];

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <Card titulo={titulo} className="design-secao">
      <div id={id} className="design-demo">
        {children}
      </div>
    </Card>
  );
}

function Fundacao() {
  return (
    <>
      <div className="design-escalas">
        {ESCALAS.map((e) => (
          <div key={e} className="design-escala" role="group" aria-label={`Escala ${e}`}>
            <span className="design-escala__nome">{e}</span>
            {PASSOS.map((p) => (
              <span key={p} className="design-escala__amostra" title={`${e} ${p}`} style={{ background: `var(--escala-${e}-${p})` }} />
            ))}
          </div>
        ))}
      </div>
      <div className="design-tipografia">
        {(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'] as const).map((t) => (
          <p key={t} style={{ fontSize: `var(--texto-${t})`, margin: 0 }}>
            texto-{t}: Finanças pessoais
          </p>
        ))}
      </div>
      <div className="design-sombras">
        {(['sm', 'md', 'lg'] as const).map((s) => (
          <span key={s} className="design-sombra" style={{ boxShadow: `var(--sombra-${s})` }}>
            sombra-{s}
          </span>
        ))}
      </div>
    </>
  );
}

function Acoes() {
  const [carregando, setCarregando] = useState(false);
  return (
    <>
      <div className="design-linha">
        {VARIANTES.map((v) => (
          <Button key={v} variante={v}>
            {v}
          </Button>
        ))}
      </div>
      <div className="design-linha">
        <Button tamanho="pequeno">Pequeno</Button>
        <Button disabled>Desabilitado</Button>
        <Button carregando={carregando} onClick={() => { setCarregando(true); window.setTimeout(() => setCarregando(false), 1500); }}>
          Salvar
        </Button>
        <IconButton aria-label="Configurações" icone="⚙" />
        <Tooltip texto="Dica ao focar ou passar o mouse">
          <Button variante="secundario">Com dica</Button>
        </Tooltip>
        <Dropdown gatilho="Ações ▾" rotulo="Ações de exemplo" itens={[{ rotulo: 'Editar', aoSelecionar: () => {} }, { rotulo: 'Duplicar', aoSelecionar: () => {} }, { rotulo: 'Excluir', aoSelecionar: () => {}, perigo: true }]} />
        <Popover gatilho="Popover" rotulo="Exemplo de popover">
          <p style={{ margin: 0 }}>Conteúdo flutuante com foco e Esc.</p>
        </Popover>
      </div>
    </>
  );
}

function Campos() {
  const [valor, setValor] = useState<number | null>(150000);
  const [busca, setBusca] = useState('');
  const [data, setData] = useState('2026-10-05');
  const [intervalo, setIntervalo] = useState<Intervalo>({ inicio: '2026-10-01', fim: '2026-10-31' });
  const [categoria, setCategoria] = useState('');
  const [ordem, setOrdem] = useState('crescente');
  const [ligado, setLigado] = useState(true);
  const [meta, setMeta] = useState(40);
  return (
    <div className="design-grade">
      <Input label="Nome" placeholder="Digite aqui" dica="Dica de preenchimento" />
      <Input label="Com erro" defaultValue="abc" erro="Mensagem de erro" />
      <Input label="Desabilitado" disabled defaultValue="Não editável" />
      <Select label="Tipo" defaultValue="corrente">
        <option value="corrente">Corrente</option>
        <option value="poupanca">Poupança</option>
      </Select>
      <Textarea label="Observação" placeholder="Texto longo" />
      <CurrencyInput label="Valor (centavos)" value={valor} onChange={setValor} dica={valor === null ? 'vazio' : `${valor} centavos`} />
      <SearchInput label="Buscar" value={busca} onChange={setBusca} />
      <Combobox label="Categoria" value={categoria} onChange={setCategoria} opcoes={[{ valor: 'a', rotulo: 'Alimentação' }, { valor: 'l', rotulo: 'Lazer' }, { valor: 's', rotulo: 'Saúde' }]} placeholder="Escolha…" />
      <DatePicker label="Data" value={data} onChange={setData} />
      <DateRangePicker legenda="Período" value={intervalo} onChange={setIntervalo} />
      <Slider label="Meta de poupança" min={0} max={100} step={5} value={meta} onChange={setMeta} formatar={(n) => `${n}%`} />
      <RadioGroup legenda="Ordem" value={ordem} onChange={setOrdem} horizontal opcoes={[{ valor: 'crescente', rotulo: 'Crescente' }, { valor: 'decrescente', rotulo: 'Decrescente' }]} />
      <div className="design-pilha">
        <Checkbox label="Receber lembretes" defaultChecked />
        <Checkbox label="Com erro" erro="Obrigatório" />
        <Switch label="Ocultar valores" checked={ligado} onChange={setLigado} />
      </div>
    </div>
  );
}

function Sobreposicoes() {
  const [modal, setModal] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const { mostrar } = useToast();
  return (
    <div className="design-linha">
      <Button variante="secundario" onClick={() => setModal(true)}>Abrir modal</Button>
      <Button variante="secundario" onClick={() => setGaveta(true)}>Abrir gaveta</Button>
      <Button variante="perigo" onClick={() => setConfirmar(true)}>Confirmar exclusão</Button>
      {(['sucesso', 'info', 'aviso', 'erro'] as const).map((t) => (
        <Button key={t} variante="fantasma" onClick={() => mostrar(`Notificação de ${t}`, { tipo: t })}>
          Toast {t}
        </Button>
      ))}
      <Modal aberto={modal} titulo="Exemplo de modal" onFechar={() => setModal(false)} rodape={<Button onClick={() => setModal(false)}>Entendi</Button>}>
        Foco preso, Esc fecha e o foco volta ao botão que abriu.
      </Modal>
      <Drawer aberto={gaveta} titulo="Exemplo de gaveta" onFechar={() => setGaveta(false)}>
        Painel lateral; no celular sobe de baixo.
      </Drawer>
      {confirmar ? <ConfirmDialog titulo="Excluir item" mensagem="Esta ação não pode ser desfeita." rotuloConfirmar="Excluir" perigo onConfirmar={() => setConfirmar(false)} onCancelar={() => setConfirmar(false)} /> : null}
    </div>
  );
}

function Navegacao() {
  const [pagina, setPagina] = useState(3);
  return (
    <>
      <Breadcrumb itens={[{ rotulo: 'Início', to: '/' }, { rotulo: 'Contas', to: '/contas' }, { rotulo: 'Nubank' }]} />
      <Tabs rotulo="Exemplo de abas" abas={[{ id: 'a', rotulo: 'Resumo', conteudo: <p>Conteúdo do resumo.</p> }, { id: 'b', rotulo: 'Detalhes', conteudo: <p>Conteúdo dos detalhes.</p> }, { id: 'c', rotulo: 'Histórico', conteudo: <p>Conteúdo do histórico.</p> }]} />
      <Accordion multiplo abertosIniciais={['a']} itens={[{ id: 'a', titulo: 'Como funciona?', conteudo: 'Cada item abre e fecha com Enter ou Espaço.' }, { id: 'b', titulo: 'Posso abrir vários?', conteudo: 'Sim, no modo múltiplo.' }]} />
      <Stepper atual={1} etapas={[{ rotulo: 'Arquivo' }, { rotulo: 'Colunas', descricao: 'Mapear' }, { rotulo: 'Revisão' }]} />
      <Pagination pagina={pagina} totalPaginas={12} onChange={setPagina} />
    </>
  );
}

function Exibicao() {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [chips, setChips] = useState(['viagem', 'trabalho', 'casa']);
  return (
    <>
      <div className="design-linha">
        {TONS.map((t) => (
          <Badge key={t} tom={t}>
            {t}
          </Badge>
        ))}
        {chips.map((c) => (
          <Chip key={c} rotulo={c} aoRemover={() => setChips(chips.filter((x) => x !== c))} />
        ))}
        <Avatar nome="Polyana Moraes" />
        <Avatar nome="Antonio Roger" tamanho="grande" />
      </div>
      <div className="design-linha">
        <ProgressBar valor={30} max={100} rotulo="Dentro do limite" />
        <ProgressBar valor={85} max={100} rotulo="Em atenção" />
        <ProgressBar valor={120} max={100} rotulo="Estourado" />
        <ProgressRing valor={65} max={100} rotulo="Meta" />
        <Spinner />
      </div>
      <div className="design-linha">
        <Skeleton linhas={3} />
        <Skeleton variante="circulo" />
        <Skeleton variante="bloco" largura="10rem" />
      </div>
      <DataList colunas itens={[{ rotulo: 'Saldo', valor: formatarMoeda(2028120) }, { rotulo: 'Compras', valor: 42 }, { rotulo: 'Ticket médio', valor: formatarMoeda(4830) }]} />
      <Table colunas={COLUNAS} linhas={GASTOS} chave={(g) => g.id} legenda="Gastos de exemplo" ordenacaoInicial={{ coluna: 'valor', direcao: 'desc' }} selecionadas={selecionadas} aoSelecionar={setSelecionadas} rotuloSelecao={(g) => `Selecionar ${g.nome}`} tamanhoPagina={4} />
    </>
  );
}

function Feedback() {
  return (
    <>
      {(['erro', 'aviso', 'sucesso', 'info'] as const).map((t) => (
        <Alert key={t} tipo={t} titulo={`Alerta de ${t}`}>
          Mensagem em linha com o tipo dito em texto.
        </Alert>
      ))}
      <Banner tipo="info" aoDispensar={() => {}} acao={<Button tamanho="pequeno" variante="secundario">Ver novidades</Button>}>
        Banner dispensável com ação.
      </Banner>
      <div className="design-grade">
        <EmptyState titulo="Nenhuma conta ainda" acao={<Button>Criar conta</Button>}>
          Contas são onde seu dinheiro está.
        </EmptyState>
        <ErrorState titulo="Falha ao carregar" aoTentarNovamente={() => {}}>
          Não foi possível ler os dados.
        </ErrorState>
      </div>
    </>
  );
}

/** Catálogo vivo da biblioteca de componentes: tokens, componentes e variantes, nos dois temas. */
export function DesignPage() {
  const { preferencias, alterar } = usePreferencias();
  const escuro = preferencias.tema !== 'claro';
  return (
    <div className="design">
      <TituloPagina acoes={<Switch label="Tema escuro" checked={escuro} onChange={(v) => alterar({ tema: v ? 'escuro' : 'claro' })} />}>Design system</TituloPagina>
      <p className="design-intro">Catálogo dos componentes de <code>src/ds</code>. Tudo aqui é interativo e usa só os tokens de <code>tokens.css</code>.</p>
      <Secao id="fundacao" titulo="Fundação: cores, tipografia e sombras"><Fundacao /></Secao>
      <Secao id="acoes" titulo="Ação"><Acoes /></Secao>
      <Secao id="campos" titulo="Campos"><Campos /></Secao>
      <Secao id="sobreposicoes" titulo="Sobreposições e notificações"><Sobreposicoes /></Secao>
      <Secao id="navegacao" titulo="Navegação e organização"><Navegacao /></Secao>
      <Secao id="exibicao" titulo="Exibição de dados"><Exibicao /></Secao>
      <Secao id="feedback" titulo="Feedback e estados"><Feedback /></Secao>
    </div>
  );
}
