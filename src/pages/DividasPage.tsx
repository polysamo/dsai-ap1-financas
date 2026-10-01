import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DividaForm } from '../components/dividas/DividaForm';
import { PagamentoDividaForm } from '../components/dividas/PagamentoDividaForm';
import { ResumoDivida } from '../components/dividas/ResumoDivida';
import { SimuladorDividas } from '../components/dividas/SimuladorDividas';
import { TabelaAmortizacao } from '../components/dividas/TabelaAmortizacao';
import { ROTULO_SISTEMA, rotulosTipo } from '../components/dividas/rotulos';
import { Alerta, Botao, CampoSelect, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
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
      <TituloPagina>Dívidas e empréstimos</TituloPagina>
      <div className="dividas-pagina">
        {erro ? <Alerta>{erro}</Alerta> : null}

        {!divida || !resumo || !rotulos ? (
          <EstadoVazio titulo="Nenhuma dívida cadastrada">
            Cadastre um financiamento ou empréstimo para acompanhar parcelas, juros e saldo, ou use o simulador abaixo.
          </EstadoVazio>
        ) : (
          <>
            <Cartao>
              <div className="dividas-seletor">
                <div className="dividas-seletor-campo">
                  <CampoSelect label="Dívida" value={divida.id} onChange={(e) => setParams({ divida: e.target.value })}>
                    {estado.dividas.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nome}
                      </option>
                    ))}
                  </CampoSelect>
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

        <Cartao titulo="Nova dívida ou empréstimo">
          <DividaForm onSalvar={(dados) => store.aplicar((s) => criarDivida(s, dados))} />
        </Cartao>

        <Cartao titulo="Simulador Price x SAC">
          <SimuladorDividas />
        </Cartao>
      </div>

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
