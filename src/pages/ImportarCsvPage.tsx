import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CsvMapeamento } from '../components/CsvMapeamento';
import { CsvPrevia, type LinhaPrevia } from '../components/CsvPrevia';
import { Alerta, Botao, Cartao, CampoSelect, TituloPagina } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import {
  adivinharMapeamento,
  decodificar,
  desfazerImportacao,
  detectarSeparador,
  importarTransacoes,
  interpretarLinhas,
  marcarDuplicatas,
  parseCsv,
  sugerirCategoria,
  sugerirTags,
  validarArquivo,
} from '../domain/csv';
import { hojeISO } from '../domain/date';
import type { MapeamentoCsv } from '../domain/types';
import { lerArquivoBuffer } from '../lib/download';
import { useEstado, useStore } from '../state/store';
import './ImportarCsvPage.css';

interface Resumo {
  importacaoId: string;
  importadas: number;
  ignoradas: number;
  comErro: number;
}

const ETAPAS = ['Conta', 'Arquivo', 'Mapear colunas', 'Revisar', 'Confirmar'];

export function ImportarCsvPage() {
  const navigate = useNavigate();
  const store = useStore();
  const estado = useEstado();
  const contasAtivas = estado.contas.filter((c) => !c.arquivada);

  const [contaId, setContaId] = useState('');
  const contaEfetiva = contasAtivas.some((c) => c.id === contaId) ? contaId : (contasAtivas[0]?.id ?? '');
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [linhasCsv, setLinhasCsv] = useState<string[][] | null>(null);
  const [mapeamento, setMapeamento] = useState<MapeamentoCsv | null>(null);
  const [selecao, setSelecao] = useState<Record<number, boolean>>({});
  const [categoriasEscolhidas, setCategoriasEscolhidas] = useState<Record<number, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const ultimaImportacao = estado.importacoes[estado.importacoes.length - 1];

  const reiniciar = () => {
    setNomeArquivo(null);
    setLinhasCsv(null);
    setMapeamento(null);
    setSelecao({});
    setCategoriasEscolhidas({});
  };

  const carregarArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro(null);
    setResumo(null);
    const valido = validarArquivo(arquivo.name, arquivo.size);
    if (!valido.ok) {
      reiniciar();
      setErro(valido.erro);
      return;
    }
    try {
      const texto = decodificar(new Uint8Array(await lerArquivoBuffer(arquivo)));
      const linhas = parseCsv(texto, detectarSeparador(texto));
      if (linhas.length === 0) {
        reiniciar();
        setErro('O arquivo está vazio.');
        return;
      }
      const lembrado = estado.mapeamentosCsv[contaEfetiva];
      const colunas = Math.max(...linhas.map((l) => l.length));
      const aproveitavel = lembrado && [lembrado.colData, lembrado.colDescricao, lembrado.colValor, lembrado.colCredito, lembrado.colDebito].every((c) => c === null || c < colunas);
      setLinhasCsv(linhas);
      setMapeamento(aproveitavel ? lembrado : adivinharMapeamento(linhas));
      setNomeArquivo(arquivo.name);
      setSelecao({});
      setCategoriasEscolhidas({});
    } catch (e) {
      reiniciar();
      setErro(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.');
    }
  };

  const linhas: LinhaPrevia[] = useMemo(() => {
    if (!linhasCsv || !mapeamento) return [];
    const interpretadas = interpretarLinhas(linhasCsv, mapeamento);
    const duplicadas = marcarDuplicatas(interpretadas, estado, contaEfetiva);
    return interpretadas.map((l) => {
      const duplicata = duplicadas.has(l.indice);
      return {
        ...l,
        duplicata,
        selecionada: l.erro ? false : (selecao[l.indice] ?? !duplicata),
        categoriaId: l.erro ? undefined : (categoriasEscolhidas[l.indice] ?? sugerirCategoria(estado, l.descricao, l.tipo)),
        tags: l.erro ? [] : sugerirTags(estado, l.descricao, l.tipo),
      };
    });
  }, [linhasCsv, mapeamento, estado, contaEfetiva, selecao, categoriasEscolhidas]);

  const aImportar = linhas.filter((l) => l.selecionada);
  const comErro = linhas.filter((l) => l.erro).length;
  const ignoradas = linhas.length - aImportar.length - comErro;

  const confirmar = () => {
    if (!mapeamento) return;
    const itens = aImportar.map((l) => ({ data: l.data!, descricao: l.descricao, valor: l.valor, tipo: l.tipo, categoriaId: l.categoriaId ?? '', tags: l.tags }));
    let criada = '';
    const r = store.aplicar((s) => {
      const imp = importarTransacoes(s, contaEfetiva, itens, mapeamento, hojeISO());
      if (!imp.ok) return imp;
      criada = imp.valor.importacao.id;
      return { ok: true, valor: imp.valor.estado };
    });
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setErro(null);
    setResumo({ importacaoId: criada, importadas: itens.length, ignoradas, comErro });
    reiniciar();
  };

  const desfazer = (id: string) => {
    const r = store.aplicar((s) => desfazerImportacao(s, id));
    if (!r.ok) return setErro(r.erro);
    setErro(null);
    setResumo(null);
  };

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    void carregarArquivo(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <TituloPagina>Importar CSV</TituloPagina>
      <div className="importar-pagina">
        <ol className="importar-etapas" aria-label="Etapas da importação">
          {ETAPAS.map((nome, i) => {
            const atual = resumo ? 4 : linhasCsv ? 3 : contasAtivas.length === 0 ? 0 : 1;
            return (
              <li key={nome} className={`importar-etapa${i < atual ? ' importar-etapa--feita' : ''}${i === atual ? ' importar-etapa--atual' : ''}`} aria-current={i === atual ? 'step' : undefined}>
                <span className="importar-etapa__num">{i < atual ? '✓' : i + 1}</span>
                <span className="importar-etapa__nome">{nome}</span>
              </li>
            );
          })}
        </ol>
        {erro ? <Alerta>{erro}</Alerta> : null}

        {resumo ? (
          <Alerta tipo="sucesso">
            <span className="importar-resumo">
              <span data-testid="resumo">
                Importação concluída: {resumo.importadas} importadas, {resumo.ignoradas} ignoradas, {resumo.comErro} com erro.
              </span>
              <Botao variante="secundario" onClick={() => desfazer(resumo.importacaoId)}>
                Desfazer importação
              </Botao>
            </span>
          </Alerta>
        ) : null}

        {contasAtivas.length === 0 ? (
          <EmptyState titulo="Nenhuma conta para receber a importação" descricao="As transações importadas precisam de uma conta de destino." acaoRotulo="Criar uma conta" onAcao={() => navigate('/contas?novo=1')} />
        ) : (
          <Cartao titulo="1. Escolha o arquivo e a conta">
            <div className="importar-escolha">
              <CampoSelect label="Conta de destino" value={contaEfetiva} onChange={(e) => setContaId(e.target.value)}>
                {contasAtivas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </CampoSelect>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastando(true);
                }}
                onDragLeave={() => setArrastando(false)}
                onDrop={soltar}
                className={`importar-soltar${arrastando ? ' importar-soltar--ativo' : ''}`}
              >
                <p className="importar-soltar-texto">Arraste um arquivo .csv aqui ou</p>
                <Botao variante="secundario" onClick={() => entrada.current?.click()}>
                  Selecionar arquivo
                </Botao>
                <input
                  ref={entrada}
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Arquivo CSV"
                  className="importar-oculto"
                  onChange={(e) => {
                    void carregarArquivo(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                {nomeArquivo ? <p className="importar-arquivo-nome">Arquivo: {nomeArquivo}</p> : null}
              </div>
            </div>
          </Cartao>
        )}

        {linhasCsv && mapeamento ? (
          <>
            <Cartao titulo="2. Mapeie as colunas">
              <CsvMapeamento colunas={linhasCsv[0].map((c, i) => (mapeamento.temCabecalho ? c : `${i + 1}`))} mapeamento={mapeamento} onChange={setMapeamento} />
            </Cartao>
            <Cartao
              titulo="3. Revise e confirme"
              acoes={
                <span className="importar-contadores" aria-live="polite" data-testid="contadores">
                  {aImportar.length} a importar · {ignoradas} ignoradas · {comErro} com erro
                </span>
              }
            >
              {linhas.length === 0 ? (
                <p className="importar-vazio">Nenhuma linha de dados no arquivo.</p>
              ) : (
                <CsvPrevia
                  linhas={linhas}
                  categorias={estado.categorias}
                  onSelecionar={(i, v) => setSelecao((s) => ({ ...s, [i]: v }))}
                  onCategoria={(i, c) => setCategoriasEscolhidas((s) => ({ ...s, [i]: c }))}
                />
              )}
              <div className="importar-acoes">
                <Botao disabled={aImportar.length === 0} onClick={confirmar}>
                  {aImportar.length === 1 ? 'Importar 1 transação' : `Importar ${aImportar.length} transações`}
                </Botao>
                <Botao variante="secundario" onClick={reiniciar}>
                  Cancelar
                </Botao>
              </div>
            </Cartao>
          </>
        ) : null}

        {!resumo && !linhasCsv && ultimaImportacao ? (
          <Cartao titulo="Última importação">
            <div className="importar-ultima">
              <span>
                {ultimaImportacao.transacaoIds.length} transações em {ultimaImportacao.data.split('-').reverse().join('/')}.
              </span>
              <Botao variante="secundario" onClick={() => desfazer(ultimaImportacao.id)}>
                Desfazer importação
              </Botao>
            </div>
          </Cartao>
        ) : null}
      </div>
    </div>
  );
}
