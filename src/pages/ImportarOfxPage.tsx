import './ImportarOfxPage.css';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { OfxPrevia, type LinhaPreviaOfx } from '../components/OfxPrevia';
import { Alerta, Botao, Cartao, CampoSelect, EstadoVazio, TituloPagina } from '../components/ui';
import { desfazerImportacao, sugerirCategoria, sugerirTags } from '../domain/csv';
import { formatarData, hojeISO } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import {
  conferirSaldo,
  decodificarOfx,
  importarOfx,
  marcarDuplicatasOfx,
  parseOfx,
  validarArquivoOfx,
  type ArquivoOfx,
  type SaldoOfx,
} from '../domain/ofx';
import { lerArquivoBuffer } from '../lib/download';
import { useEstado, useStore } from '../state/store';

interface Resumo {
  importacaoId: string;
  contaId: string;
  importadas: number;
  ignoradas: number;
  comErro: number;
  saldoFinal: SaldoOfx | null;
}

export function ImportarOfxPage() {
  const store = useStore();
  const estado = useEstado();
  const contasAtivas = estado.contas.filter((c) => !c.arquivada);

  const [contaId, setContaId] = useState('');
  const contaEfetiva = contasAtivas.some((c) => c.id === contaId) ? contaId : (contasAtivas[0]?.id ?? '');
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<ArquivoOfx | null>(null);
  const [contaArquivo, setContaArquivo] = useState(0);
  const [selecao, setSelecao] = useState<Record<number, boolean>>({});
  const [categoriasEscolhidas, setCategoriasEscolhidas] = useState<Record<number, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const ultimaImportacao = estado.importacoes[estado.importacoes.length - 1];
  const extrato = arquivo?.contas[contaArquivo] ?? null;

  const reiniciar = () => {
    setNomeArquivo(null);
    setArquivo(null);
    setContaArquivo(0);
    setSelecao({});
    setCategoriasEscolhidas({});
  };

  const carregarArquivo = async (file: File | undefined) => {
    if (!file) return;
    setErro(null);
    setResumo(null);
    const valido = validarArquivoOfx(file.name, file.size);
    if (!valido.ok) {
      reiniciar();
      setErro(valido.erro);
      return;
    }
    try {
      const lido = parseOfx(decodificarOfx(new Uint8Array(await lerArquivoBuffer(file))));
      if (!lido.ok) {
        reiniciar();
        setErro(lido.erro);
        return;
      }
      setArquivo(lido.valor);
      setNomeArquivo(file.name);
      setContaArquivo(0);
      setSelecao({});
      setCategoriasEscolhidas({});
    } catch (e) {
      reiniciar();
      setErro(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.');
    }
  };

  const linhas: LinhaPreviaOfx[] = useMemo(() => {
    if (!extrato) return [];
    const duplicadas = marcarDuplicatasOfx(extrato.transacoes, estado, contaEfetiva);
    return extrato.transacoes.map((l) => {
      const duplicata = duplicadas.get(l.indice);
      return {
        ...l,
        duplicata,
        selecionada: l.erro ? false : (selecao[l.indice] ?? !duplicata),
        categoriaId: l.erro ? undefined : (categoriasEscolhidas[l.indice] ?? sugerirCategoria(estado, l.descricao, l.tipo)),
      };
    });
  }, [extrato, estado, contaEfetiva, selecao, categoriasEscolhidas]);

  const aImportar = linhas.filter((l) => l.selecionada);
  const comErro = linhas.filter((l) => l.erro).length;
  const ignoradas = linhas.length - aImportar.length - comErro;

  const confirmar = () => {
    if (!extrato) return;
    const itens = aImportar.map((l) => ({
      data: l.data!,
      descricao: l.descricao,
      valor: l.valor,
      tipo: l.tipo,
      categoriaId: l.categoriaId ?? '',
      tags: sugerirTags(estado, l.descricao, l.tipo),
      fitid: l.fitid,
    }));
    let criada = '';
    const r = store.aplicar((s) => {
      const imp = importarOfx(s, contaEfetiva, itens, hojeISO());
      if (!imp.ok) return imp;
      criada = imp.valor.importacao.id;
      return { ok: true, valor: imp.valor.estado };
    });
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setErro(null);
    setResumo({ importacaoId: criada, contaId: contaEfetiva, importadas: itens.length, ignoradas, comErro, saldoFinal: extrato.saldoFinal });
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

  const conferencia = resumo ? conferirSaldo(estado, resumo.contaId, resumo.saldoFinal) : null;
  const dataSaldo = resumo?.saldoFinal?.data ? ` em ${formatarData(resumo.saldoFinal.data)}` : '';

  return (
    <div className="ofx-pagina">
      <TituloPagina>Importar OFX</TituloPagina>
      <div className="ofx-pagina__pilha">
        {erro ? <Alerta>{erro}</Alerta> : null}

        {resumo ? (
          <>
            <Alerta tipo="sucesso">
              <span className="ofx-pagina__linha-acao">
                <span data-testid="resumo-ofx">
                  Importação concluída: {resumo.importadas} importadas, {resumo.ignoradas} ignoradas, {resumo.comErro} com erro.
                </span>
                <Botao variante="secundario" onClick={() => desfazer(resumo.importacaoId)}>
                  Desfazer importação
                </Botao>
              </span>
            </Alerta>
            {conferencia?.situacao === 'conferido' ? (
              <Alerta tipo="sucesso">
                <span data-testid="conferencia-ofx">
                  Saldo conferido: o saldo final do arquivo{dataSaldo} ({formatarMoeda(conferencia.esperado)}) é igual ao saldo calculado da conta.
                </span>
              </Alerta>
            ) : null}
            {conferencia?.situacao === 'divergente' ? (
              <Alerta tipo="aviso">
                <span data-testid="conferencia-ofx">
                  Saldo divergente: o arquivo informa {formatarMoeda(conferencia.esperado)}{dataSaldo}, mas o saldo calculado da conta é {formatarMoeda(conferencia.calculado)}
                  (diferença de {formatarMoeda(Math.abs(conferencia.diferenca))}). Confira o saldo inicial da conta e as transações já lançadas.
                </span>
              </Alerta>
            ) : null}
            {conferencia?.situacao === 'indisponivel' ? (
              <Alerta tipo="aviso">
                <span data-testid="conferencia-ofx">Conferência de saldo não realizada: o arquivo não informa o saldo final (LEDGERBAL).</span>
              </Alerta>
            ) : null}
          </>
        ) : null}

        {contasAtivas.length === 0 ? (
          <EstadoVazio titulo="Nenhuma conta para receber a importação" acao={<Link to="/contas" className="ofx-pagina__link">Criar uma conta</Link>}>
            As transações importadas precisam de uma conta de destino.
          </EstadoVazio>
        ) : (
          <Cartao titulo="1. Escolha o arquivo e a conta">
            <div className="ofx-pagina__grade">
              <CampoSelect label="Conta de destino" value={contaEfetiva} onChange={(e) => setContaId(e.target.value)}>
                {contasAtivas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </CampoSelect>
              <div
                className={`ofx-pagina__soltar ${arrastando ? 'ofx-pagina__soltar--ativo' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastando(true);
                }}
                onDragLeave={() => setArrastando(false)}
                onDrop={soltar}
              >
                <p className="ofx-pagina__texto">Arraste um arquivo .ofx ou .qfx aqui ou</p>
                <Botao variante="secundario" onClick={() => entrada.current?.click()}>
                  Selecionar arquivo
                </Botao>
                <input
                  ref={entrada}
                  type="file"
                  accept=".ofx,.qfx"
                  aria-label="Arquivo OFX"
                  className="ofx-pagina__oculto"
                  onChange={(e) => {
                    void carregarArquivo(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                {nomeArquivo ? <p className="ofx-pagina__nota">Arquivo: {nomeArquivo}</p> : null}
              </div>
            </div>
          </Cartao>
        )}

        {arquivo && extrato ? (
          <>
            <Cartao titulo="2. Confira o que o arquivo contém">
              <ul className="ofx-pagina__contas" aria-label="Contas no arquivo">
                {arquivo.contas.map((c, i) => (
                  <li key={i}>
                    Banco {c.bancoId || '—'} · conta {c.contaId || '—'} · {c.transacoes.length} lançamentos
                    {c.saldoFinal ? ` · saldo final ${formatarMoeda(c.saldoFinal.valor)}${c.saldoFinal.data ? ` em ${formatarData(c.saldoFinal.data)}` : ''}` : ' · sem saldo final'}
                  </li>
                ))}
              </ul>
              {arquivo.contas.length > 1 ? (
                <CampoSelect
                  label="Conta do arquivo a importar"
                  value={String(contaArquivo)}
                  onChange={(e) => {
                    setContaArquivo(Number(e.target.value));
                    setSelecao({});
                    setCategoriasEscolhidas({});
                  }}
                >
                  {arquivo.contas.map((c, i) => (
                    <option key={i} value={i}>
                      {`Banco ${c.bancoId || '—'} · conta ${c.contaId || '—'}`}
                    </option>
                  ))}
                </CampoSelect>
              ) : null}
            </Cartao>
            <Cartao
              titulo="3. Revise e confirme"
              acoes={
                <span className="ofx-pagina__contadores" aria-live="polite" data-testid="contadores-ofx">
                  {aImportar.length} a importar · {ignoradas} ignoradas · {comErro} com erro
                </span>
              }
            >
              <OfxPrevia
                linhas={linhas}
                categorias={estado.categorias}
                onSelecionar={(i, v) => setSelecao((s) => ({ ...s, [i]: v }))}
                onCategoria={(i, c) => setCategoriasEscolhidas((s) => ({ ...s, [i]: c }))}
              />
              <div className="ofx-pagina__acoes">
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

        {!resumo && !arquivo && ultimaImportacao ? (
          <Cartao titulo="Última importação">
            <div className="ofx-pagina__linha-acao">
              <span>
                {ultimaImportacao.transacaoIds.length} transações em {formatarData(ultimaImportacao.data)}.
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
