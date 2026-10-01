import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Alerta, Botao, CampoSelect, CampoTexto, Cartao, EstadoVazio, TituloPagina, Valor } from '../components/ui';
import {
  TOLERANCIA_PADRAO,
  calcularConciliacao,
  descartarRascunho,
  fecharConciliacao,
  historicoConta,
  interpretarExtrato,
  marcarSugestoes,
  rascunhoDaConta,
  reabrirUltima,
  salvarRascunho,
  sugerirPares,
  validarRascunho,
  type ErroLinha,
  type LinhaExtrato,
  type ParSugerido,
  type Rascunho,
} from '../domain/conciliacao';
import { efeitoTransacao, ordenarContas } from '../domain/contas';
import { formatarData } from '../domain/date';
import { formatarMoeda, parseValor, valorParaCampo } from '../domain/money';
import type { AppState, Resultado } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import './ConciliacaoPage.css';

export function ConciliacaoPage() {
  const estado = useEstado();
  const contas = ordenarContas(estado.contas.filter((c) => !c.arquivada && c.tipo !== 'cartao'));
  const [contaId, setContaId] = useState('');
  const conta = contas.find((c) => c.id === contaId) ?? contas[0];

  return (
    <div className="concil-pagina">
      <TituloPagina>Conciliação</TituloPagina>
      <p className="concil-intro">Confira uma conta com o extrato do banco: informe a data e o saldo do extrato e marque as transações que já aparecem nele.</p>
      {!conta ? (
        <EstadoVazio
          titulo="Nenhuma conta para conciliar"
          acao={
            <Link to="/contas" className="underline">
              Ir para Contas
            </Link>
          }
        >
          Cadastre uma conta que não seja cartão de crédito para conciliar com o extrato.
        </EstadoVazio>
      ) : (
        <>
          <CampoSelect label="Conta" value={conta.id} onChange={(e) => setContaId(e.target.value)}>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </CampoSelect>
          <PainelConta key={`${conta.id}:${historicoConta(estado, conta.id).length}`} contaId={conta.id} />
        </>
      )}
    </div>
  );
}

type Dialogo = 'ajuste' | 'reabrir' | 'descartar' | null;

interface Sugestao {
  erros: ErroLinha[];
  pares: ParSugerido[];
  semPar: LinhaExtrato[];
  total: number;
}

function PainelConta({ contaId }: { contaId: string }) {
  const store = useStore();
  const estado = useEstado();
  const salvo = rascunhoDaConta(estado, contaId);
  const [dataTxt, setDataTxt] = useState(salvo.data);
  const [saldoTxt, setSaldoTxt] = useState(salvo.saldoExtrato === null ? '' : valorParaCampo(salvo.saldoExtrato));
  const [erroCampo, setErroCampo] = useState<{ campo?: string; erro: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [textoExtrato, setTextoExtrato] = useState('');
  const [toleranciaTxt, setToleranciaTxt] = useState(String(TOLERANCIA_PADRAO));
  const [sugestao, setSugestao] = useState<Sugestao | null>(null);

  const saldoDigitado = saldoTxt.trim() === '' ? null : parseValor(saldoTxt);
  const saldoInvalido = saldoTxt.trim() !== '' && saldoDigitado === null;
  const atual: Rascunho = { data: dataTxt, saldoExtrato: saldoDigitado, marcadas: salvo.marcadas };
  const resumo = useMemo(
    () => calcularConciliacao(estado, contaId, { data: dataTxt, saldoExtrato: saldoDigitado, marcadas: salvo.marcadas }),
    [estado, contaId, dataTxt, saldoDigitado, salvo.marcadas],
  );
  const historico = historicoConta(estado, contaId);
  const marcadasIds = new Set(resumo.marcadas.map((t) => t.id));
  const categorias = new Map(estado.categorias.map((c) => [c.id, c.nome]));
  const diferenca = resumo.diferenca;

  const erroDe = (campo: string) => {
    if (erroCampo?.campo === campo) return erroCampo.erro;
    if (campo === 'saldoExtrato' && saldoInvalido) return 'Informe um valor válido, como 1.234,56.';
    return undefined;
  };

  const executar = (op: (e: AppState) => Resultado<AppState>): boolean => {
    const r = store.aplicar(op);
    if (!r.ok) {
      setErro(r.erro);
      return false;
    }
    setErro(null);
    return true;
  };

  const persistir = (parcial: Partial<Rascunho> = {}) => executar((e) => salvarRascunho(e, contaId, { ...atual, ...parcial }));

  const alternar = (id: string) => {
    const marcadas = marcadasIds.has(id) ? salvo.marcadas.filter((m) => m !== id) : [...salvo.marcadas, id];
    persistir({ marcadas });
  };

  const fechar = (ajustar: boolean) => {
    setDialogo(null);
    executar((e) => {
      const s = salvarRascunho(e, contaId, atual);
      return s.ok ? fecharConciliacao(s.valor, contaId, { ajustar }) : s;
    });
  };

  const pedirFechamento = () => {
    setErroCampo(null);
    const v = validarRascunho(estado, contaId, atual);
    if (!v.ok) {
      setErroCampo({ campo: v.campo, erro: v.erro });
      return;
    }
    if (diferenca === 0) fechar(false);
    else setDialogo('ajuste');
  };

  const toleranciaValida = /^\d+$/.test(toleranciaTxt.trim()) && Number(toleranciaTxt) <= 30;

  const sugerir = () => {
    if (!toleranciaValida) return;
    const { linhas, erros } = interpretarExtrato(textoExtrato);
    const candidatas = resumo.elegiveis.filter((t) => !marcadasIds.has(t.id));
    setSugestao({ erros, ...sugerirPares(linhas, candidatas, Number(toleranciaTxt)), total: linhas.length });
  };

  const aceitar = () => {
    if (!sugestao) return;
    if (persistir(marcarSugestoes(atual, sugestao.pares.map((p) => p.transacao.id)))) setSugestao(null);
  };

  const semRascunho = salvo.marcadas.length === 0 && !salvo.data && salvo.saldoExtrato === null;

  return (
    <>
      {erro ? <Alerta>{erro}</Alerta> : null}

      <Cartao titulo="Extrato do banco">
        <div className="concil-form">
          <CampoTexto label="Data do extrato" type="date" value={dataTxt} onChange={(e) => setDataTxt(e.target.value)} onBlur={() => persistir()} erro={erroDe('data')} />
          <CampoTexto
            label="Saldo do extrato"
            inputMode="decimal"
            placeholder="0,00"
            value={saldoTxt}
            onChange={(e) => setSaldoTxt(e.target.value)}
            onBlur={() => persistir()}
            erro={erroDe('saldoExtrato')}
            dica="Pode ser negativo."
          />
        </div>
      </Cartao>

      <Cartao titulo="Resumo">
        <dl className="concil-resumo">
          <div className="concil-resumo-item">
            <dt>Saldo conciliado</dt>
            <dd data-testid="saldo-conciliado">{formatarMoeda(resumo.saldoConciliado)}</dd>
          </div>
          <div className="concil-resumo-item">
            <dt>Saldo calculado</dt>
            <dd data-testid="saldo-calculado">{formatarMoeda(resumo.saldoCalculado)}</dd>
          </div>
          <div className="concil-resumo-item">
            <dt>Diferença</dt>
            <dd data-testid="diferenca" className={diferenca === 0 ? 'concil-diferenca-zero' : diferenca === null ? '' : 'concil-diferenca-aberta'}>
              {diferenca === null ? '—' : formatarMoeda(diferenca)}
              {diferenca === 0 ? ' (confere)' : ''}
            </dd>
          </div>
          <div className="concil-resumo-item">
            <dt>Transações pendentes</dt>
            <dd data-testid="pendentes">{resumo.pendentes.length}</dd>
          </div>
        </dl>
        <div className="concil-acoes">
          <Botao onClick={pedirFechamento} disabled={diferenca !== 0}>
            Fechar conciliação
          </Botao>
          <Botao variante="secundario" onClick={pedirFechamento} disabled={diferenca === null || diferenca === 0}>
            Fechar com ajuste
          </Botao>
          <Botao variante="link" onClick={() => setDialogo('descartar')} disabled={semRascunho}>
            Descartar rascunho
          </Botao>
        </div>
        {diferenca !== null && diferenca !== 0 ? (
          <p className="concil-intro" role="status">
            O extrato está {formatarMoeda(Math.abs(diferenca))} {diferenca > 0 ? 'acima' : 'abaixo'} do saldo conciliado. Marque as transações que faltam ou feche com ajuste.
          </p>
        ) : null}
      </Cartao>

      <Cartao titulo="Transações da conta">
        {resumo.elegiveis.length === 0 ? (
          <EstadoVazio titulo="Nada para conciliar">Não há transações sem conciliação{dataTxt ? ' até a data do extrato' : ''}.</EstadoVazio>
        ) : (
          <ul className="concil-lista" aria-label="Transações elegíveis">
            {resumo.elegiveis.map((t) => (
              <li key={t.id} className={`concil-linha${marcadasIds.has(t.id) ? ' concil-linha-marcada' : ''}`}>
                <label>
                  <input type="checkbox" checked={marcadasIds.has(t.id)} onChange={() => alternar(t.id)} aria-label={`Conciliar ${t.descricao || 'sem descrição'}`} />
                  <span className="concil-linha-data">{formatarData(t.data)}</span>
                  <span className="concil-linha-desc">
                    {t.descricao || 'Sem descrição'} <small>({categorias.get(t.categoriaId) ?? 'Sem categoria'})</small>
                  </span>
                  <Valor centavos={efeitoTransacao(t)} texto={formatarMoeda(efeitoTransacao(t))} />
                </label>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Colar linhas do extrato">
        <label className="concil-rotulo" htmlFor="concil-extrato">
          Uma linha por lançamento: data;descrição;valor
        </label>
        <textarea
          id="concil-extrato"
          className="concil-extrato"
          value={textoExtrato}
          onChange={(e) => setTextoExtrato(e.target.value)}
          placeholder={'2026-09-28;Mercado;-150,00\n30/09/2026;Salário;3.000,00'}
        />
        <div className="concil-acoes">
          <div className="concil-tolerancia">
            <CampoTexto
              label="Tolerância em dias"
              inputMode="numeric"
              value={toleranciaTxt}
              onChange={(e) => setToleranciaTxt(e.target.value)}
              erro={toleranciaValida ? undefined : 'Use um número inteiro de 0 a 30.'}
            />
          </div>
          <Botao onClick={sugerir} disabled={textoExtrato.trim() === '' || !toleranciaValida}>
            Sugerir pares
          </Botao>
        </div>
        {sugestao ? (
          <div className="concil-pares">
            {sugestao.erros.length > 0 ? (
              <ul className="concil-erros" aria-label="Linhas inválidas">
                {sugestao.erros.map((e) => (
                  <li key={e.linha}>
                    Linha {e.linha}: {e.motivo}
                  </li>
                ))}
              </ul>
            ) : null}
            {sugestao.pares.length > 0 ? (
              <>
                <h3 className="concil-subtitulo">Pares sugeridos ({sugestao.pares.length})</h3>
                <ul className="concil-lista" aria-label="Pares sugeridos">
                  {sugestao.pares.map((p) => (
                    <li key={p.linha.linha} className="concil-linha">
                      <span className="concil-linha-desc">
                        {formatarData(p.linha.data)} {p.linha.descricao} ({formatarMoeda(p.linha.valor)}) com {formatarData(p.transacao.data)} {p.transacao.descricao || 'Sem descrição'}
                        {p.dias > 0 ? ` (${p.dias} ${p.dias === 1 ? 'dia' : 'dias'} de diferença)` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="concil-acoes">
                  <Botao onClick={aceitar}>Aceitar sugestões</Botao>
                </div>
              </>
            ) : sugestao.total > 0 ? (
              <Alerta tipo="aviso">Nenhum par encontrado para as linhas informadas.</Alerta>
            ) : sugestao.erros.length === 0 ? (
              <Alerta tipo="aviso">Nenhuma linha encontrada.</Alerta>
            ) : null}
            {sugestao.semPar.length > 0 ? (
              <>
                <h3 className="concil-subtitulo">Linhas sem par ({sugestao.semPar.length})</h3>
                <ul className="concil-lista" aria-label="Linhas sem par">
                  {sugestao.semPar.map((l) => (
                    <li key={l.linha} className="concil-linha">
                      <span className="concil-linha-desc">
                        {formatarData(l.data)} {l.descricao} ({formatarMoeda(l.valor)})
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </Cartao>

      <Cartao
        titulo="Histórico de conciliações"
        acoes={
          historico.length > 0 ? (
            <Botao variante="secundario" onClick={() => setDialogo('reabrir')}>
              Reabrir última conciliação
            </Botao>
          ) : undefined
        }
      >
        {historico.length === 0 ? (
          <EstadoVazio titulo="Nenhuma conciliação fechada">Quando você fechar uma conciliação ela aparece aqui.</EstadoVazio>
        ) : (
          <ul className="concil-historico" aria-label="Histórico">
            {historico.map((h) => (
              <li key={h.id} className="concil-historico-item">
                <span>{formatarData(h.data)}</span>
                <span>Saldo do extrato: {formatarMoeda(h.saldoExtrato)}</span>
                <span>
                  {h.transacaoIds.length} {h.transacaoIds.length === 1 ? 'transação' : 'transações'}
                </span>
                <span>{h.ajuste === 0 ? 'Sem ajuste' : `Ajuste: ${formatarMoeda(h.ajuste)}`}</span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      {dialogo === 'ajuste' && diferenca !== null ? (
        <ConfirmDialog
          titulo="Fechar com ajuste"
          mensagem={`Será criada uma transação de ${diferenca > 0 ? 'receita' : 'despesa'} de ${formatarMoeda(Math.abs(diferenca))} na categoria Outros, na data do extrato, para o saldo bater.`}
          rotuloConfirmar="Confirmar ajuste"
          onConfirmar={() => fechar(true)}
          onCancelar={() => setDialogo(null)}
        />
      ) : null}
      {dialogo === 'reabrir' ? (
        <ConfirmDialog
          titulo="Reabrir última conciliação"
          mensagem="As transações dessa conciliação voltam a poder ser editadas e a transação de ajuste, se houver, será apagada."
          rotuloConfirmar="Reabrir"
          perigo
          onConfirmar={() => {
            setDialogo(null);
            executar((e) => reabrirUltima(e, contaId));
          }}
          onCancelar={() => setDialogo(null)}
        />
      ) : null}
      {dialogo === 'descartar' ? (
        <ConfirmDialog
          titulo="Descartar rascunho"
          mensagem="A data, o saldo e as marcações em andamento serão apagados."
          rotuloConfirmar="Descartar"
          perigo
          onConfirmar={() => {
            setDialogo(null);
            if (executar((e) => descartarRascunho(e, contaId))) {
              setDataTxt('');
              setSaldoTxt('');
              setSugestao(null);
            }
          }}
          onCancelar={() => setDialogo(null)}
        />
      ) : null}
    </>
  );
}
