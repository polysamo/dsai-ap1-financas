import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Drawer } from '../components/Drawer';
import { DividaForm } from '../components/dividas/DividaForm';
import { PagamentoDividaForm } from '../components/dividas/PagamentoDividaForm';
import { ResumoDivida } from '../components/dividas/ResumoDivida';
import { SimuladorDividas } from '../components/dividas/SimuladorDividas';
import { TabelaAmortizacao } from '../components/dividas/TabelaAmortizacao';
import { ROTULO_SISTEMA, rotulosTipo } from '../components/dividas/rotulos';
import { Alerta, Botao, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { formatarData, hojeISO } from '../domain/date';
import { criarDivida, excluirDivida, excluirPagamentoDivida, registrarPagamentoDivida, resumoDivida } from '../domain/dividas';
import { formatarMoeda, valorParaCampo } from '../domain/money';
import { useEstado, useStore } from '../state/store';
import '../components/dividas/dividas.css';

export function DividasPage() {
  const store = useStore();
  const estado = useEstado();
  const [params, setParams] = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [novaAberta, setNovaAberta] = useState(false);
  const [simAberto, setSimAberto] = useState(false);
  const hoje = hojeISO();

  const divida = estado.dividas.find((d) => d.id === params.get('divida')) ?? estado.dividas[0];
  const resumo = useMemo(() => (divida ? resumoDivida(divida, hoje) : null), [divida, hoje]);
  const rotulos = divida ? rotulosTipo(divida.tipo) : null;

  /** Para ações sem formulário (exclusões): o erro vai para o alerta da página. */
  const aplicar = (operacao: Parameters<typeof store.aplicar>[0]) => {
    const r = store.aplicar(operacao);
    setErro(r.ok ? null : r.erro);
  };

  return (
    <div>
      <TituloPagina
        acoes={
          <div className="dividas-acoes">
            <Botao variante="secundario" onClick={() => setSimAberto(true)}>Simulador Price x SAC</Botao>
            <Botao onClick={() => setNovaAberta(true)}>Nova dívida</Botao>
          </div>
        }
      >
        Dívidas e empréstimos
      </TituloPagina>
      <div className="dividas-pagina">
        {erro ? <Alerta>{erro}</Alerta> : null}

        {!divida || !resumo || !rotulos ? (
          <EstadoVazio titulo="Nenhuma dívida cadastrada">
            Cadastre um financiamento ou empréstimo para acompanhar parcelas, juros e saldo, ou use o simulador.
          </EstadoVazio>
        ) : (
          <>
            <Cartao>
              <div className="dividas-seletor">
                <div className="dividas-grupos">
                  {([['devo', 'Eu devo'], ['emprestei', 'Me devem']] as const).map(([tipo, titulo]) => {
                    const grupo = estado.dividas.filter((d) => (d.tipo === 'devo') === (tipo === 'devo'));
                    if (grupo.length === 0) return null;
                    return (
                      <section key={tipo} aria-label={titulo} className="dividas-grupo">
                        <h2 className="dividas-grupo-titulo">{titulo}</h2>
                        <ul className="dividas-lista">
                          {grupo.map((d) => {
                            const r = resumoDivida(d, hoje);
                            const pagas = r.linhas.filter((l) => l.situacao === 'paga').length;
                            return (
                              <li key={d.id}>
                                <button
                                  type="button"
                                  className={`dividas-linha${d.id === divida.id ? ' dividas-linha-ativa' : ''}`}
                                  aria-pressed={d.id === divida.id}
                                  onClick={() => setParams({ divida: d.id })}
                                >
                                  <span className="dividas-linha-nome">{d.nome}</span>
                                  <span className="dividas-linha-saldo dividas-num">{formatarMoeda(r.saldoDevedor)}</span>
                                  <span className="dividas-linha-meta">
                                    {pagas}/{d.parcelas} parcelas pagas · {r.proxima ? `próxima em ${formatarData(r.proxima.vencimento)}` : 'quitada'}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
                <Botao variante="perigo" onClick={() => setConfirmando(true)}>
                  Excluir dívida
                </Botao>
              </div>
              <p className="dividas-termos" data-testid="termos">
                {divida.tipo === 'devo' ? 'Eu devo' : 'Eu emprestei'} {formatarMoeda(divida.principal)} · {valorParaCampo(divida.taxaBp)}% ao mês · {divida.parcelas}x · {ROTULO_SISTEMA[divida.sistema]} ·
                1ª parcela em {formatarData(divida.primeiraParcela)}
              </p>
            </Cartao>

            <Cartao titulo="Resumo">
              <ResumoDivida resumo={resumo} tipo={divida.tipo} />
            </Cartao>

            <Cartao titulo="Tabela de amortização">
              <TabelaAmortizacao linhas={resumo.linhas} />
            </Cartao>

            <Cartao titulo={`${rotulos.pagamento}s registrados`}>
              {divida.pagamentos.length > 0 ? (
                <ul className="dividas-pagamentos" aria-label={`${rotulos.pagamento}s registrados`}>
                  {divida.pagamentos.map((p) => (
                    <li key={p.id} className="dividas-pagamento">
                      <span>
                        {formatarData(p.data)} · {p.parcela === undefined ? 'Amortização extra' : `Parcela ${p.parcela}`} · {formatarMoeda(p.valor)}
                      </span>
                      <Botao
                        variante="secundario"
                        aria-label={`Excluir ${rotulos.pagamento.toLowerCase()} de ${formatarData(p.data)}`}
                        onClick={() => aplicar((s) => excluirPagamentoDivida(s, divida.id, p.id))}
                      >
                        Excluir
                      </Botao>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dividas-texto-suave dividas-espaco-baixo">Nenhum {rotulos.pagamento.toLowerCase()} registrado.</p>
              )}
              {resumo.quitada ? (
                <p className="dividas-texto-suave">Não há saldo em aberto.</p>
              ) : (
                <PagamentoDividaForm
                  key={`${divida.id}-${divida.pagamentos.length}`}
                  tipo={divida.tipo}
                  abertas={resumo.linhas.filter((l) => l.situacao !== 'paga')}
                  onSalvar={(dados) => store.aplicar((s) => registrarPagamentoDivida(s, divida.id, dados, hoje))}
                />
              )}
            </Cartao>
          </>
        )}

      </div>

      <Drawer aberto={novaAberta} titulo="Nova dívida ou empréstimo" onFechar={() => setNovaAberta(false)}>
        <DividaForm
          onSalvar={(dados) => {
            const r = store.aplicar((s) => criarDivida(s, dados));
            if (r.ok) setNovaAberta(false);
            return r;
          }}
        />
      </Drawer>

      <Drawer aberto={simAberto} titulo="Simulador Price x SAC" onFechar={() => setSimAberto(false)}>
        <SimuladorDividas />
      </Drawer>

      {confirmando && divida ? (
        <ConfirmDialog
          titulo="Excluir dívida"
          mensagem={`Excluir "${divida.nome}" e todos os seus pagamentos? Esta ação não pode ser desfeita.`}
          rotuloConfirmar="Excluir"
          perigo
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => {
            setConfirmando(false);
            setParams({}, { replace: true });
            aplicar((s) => excluirDivida(s, divida.id));
          }}
        />
      ) : null}
    </div>
  );
}
