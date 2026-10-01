import { useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { CsvMapeamento } from '../components/CsvMapeamento';
import { CsvPrevia, type LinhaPrevia } from '../components/CsvPrevia';
import { Alerta, Botao, Cartao, CampoSelect, EstadoVazio, TituloPagina } from '../components/ui';
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

interface Resumo {
  importacaoId: string;
  importadas: number;
  ignoradas: number;
  comErro: number;
}

export function ImportarCsvPage() {
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
      <div className="space-y-4">
        {erro ? <Alerta>{erro}</Alerta> : null}

        {resumo ? (
          <Alerta tipo="sucesso">
            <span className="flex flex-wrap items-center justify-between gap-2">
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
          <EstadoVazio titulo="Nenhuma conta para receber a importação" acao={<Link to="/contas" className="font-medium text-emerald-800 underline">Criar uma conta</Link>}>
            As transações importadas precisam de uma conta de destino.
          </EstadoVazio>
        ) : (
          <Cartao titulo="1. Escolha o arquivo e a conta">
            <div className="grid gap-3 sm:grid-cols-2">
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
                className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-center text-sm ${arrastando ? 'border-emerald-600 bg-emerald-50' : 'border-slate-300'}`}
              >
                <p className="text-slate-700">Arraste um arquivo .csv aqui ou</p>
                <Botao variante="secundario" onClick={() => entrada.current?.click()}>
                  Selecionar arquivo
                </Botao>
                <input
                  ref={entrada}
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Arquivo CSV"
                  className="sr-only"
                  onChange={(e) => {
                    void carregarArquivo(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                {nomeArquivo ? <p className="text-xs text-slate-600">Arquivo: {nomeArquivo}</p> : null}
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
                <span className="text-sm text-slate-700" aria-live="polite" data-testid="contadores">
                  {aImportar.length} a importar · {ignoradas} ignoradas · {comErro} com erro
                </span>
              }
            >
              {linhas.length === 0 ? (
                <p className="text-sm text-slate-600">Nenhuma linha de dados no arquivo.</p>
              ) : (
                <CsvPrevia
                  linhas={linhas}
                  categorias={estado.categorias}
                  onSelecionar={(i, v) => setSelecao((s) => ({ ...s, [i]: v }))}
                  onCategoria={(i, c) => setCategoriasEscolhidas((s) => ({ ...s, [i]: c }))}
                />
              )}
              <div className="mt-4 flex flex-wrap gap-2">
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-800">
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
