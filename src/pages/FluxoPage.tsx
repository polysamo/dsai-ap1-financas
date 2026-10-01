import './FluxoPage.css';
import { useMemo, useState } from 'react';
import { GraficoFluxo } from '../components/fluxo/GraficoFluxo';
import { TabelaFluxo } from '../components/fluxo/TabelaFluxo';
import { Alerta, Cartao, CampoSelect, EstadoVazio, TituloPagina } from '../components/ui';
import { formatarData, hojeISO } from '../domain/date';
import { JANELAS_FLUXO, calcularFluxo, oQueFazer } from '../domain/fluxoCaixa';
import { formatarMoeda } from '../domain/money';
import { useEstado } from '../state/store';

export function FluxoPage() {
  const estado = useEstado();
  const hoje = hojeISO();
  const [janela, setJanela] = useState<number>(30);
  const [soMovimento, setSoMovimento] = useState(false);

  const fluxo = useMemo(() => calcularFluxo(estado, hoje, janela), [estado, hoje, janela]);
  const acoes = useMemo(() => oQueFazer(fluxo, hoje), [fluxo, hoje]);
  const vazio = fluxo.itens.length === 0 && fluxo.saldoInicial === 0;
  const dias = soMovimento ? fluxo.dias.filter((d) => d.itens.length > 0) : fluxo.dias;

  return (
    <div className="fluxo">
      <TituloPagina>Fluxo de caixa</TituloPagina>
      <div className="fluxo__secoes">
        <Cartao>
          <div className="fluxo__filtros">
            <div className="fluxo__campo">
              <CampoSelect label="Período" value={janela} onChange={(e) => setJanela(Number(e.target.value))}>
                {JANELAS_FLUXO.map((j) => (
                  <option key={j} value={j}>{`Próximos ${j} dias`}</option>
                ))}
              </CampoSelect>
            </div>
            <label className="fluxo__check">
              <input type="checkbox" checked={soMovimento} onChange={(e) => setSoMovimento(e.target.checked)} />
              Somente dias com movimento
            </label>
          </div>
        </Cartao>

        {vazio ? (
          <EstadoVazio titulo="Nada para prever ainda">
            Cadastre contas com saldo, lançamentos agendados, recorrências, faturas de cartão ou dívidas para ver o saldo dia a dia.
          </EstadoVazio>
        ) : (
          <>
            <dl className="fluxo__resumo" aria-label="Resumo do período">
              <div><dt>Saldo inicial</dt><dd data-testid="saldo-inicial">{formatarMoeda(fluxo.saldoInicial)}</dd></div>
              <div><dt>Entradas previstas</dt><dd data-testid="total-entradas">{formatarMoeda(fluxo.totalEntradas)}</dd></div>
              <div><dt>Saídas previstas</dt><dd data-testid="total-saidas">{formatarMoeda(fluxo.totalSaidas)}</dd></div>
              <div><dt>Saldo final</dt><dd data-testid="saldo-final">{formatarMoeda(fluxo.saldoFinal)}</dd></div>
              <div>
                <dt>Menor saldo</dt>
                <dd data-testid="menor-saldo" className={fluxo.menorSaldo.saldo < 0 ? 'fluxo__negativo' : undefined}>
                  {formatarMoeda(fluxo.menorSaldo.saldo)} em {formatarData(fluxo.menorSaldo.data)}
                </dd>
              </div>
              <div><dt>Dias com saldo negativo</dt><dd data-testid="dias-negativos">{fluxo.diasNegativos}</dd></div>
            </dl>

            {fluxo.diasNegativos > 0 ? (
              <Alerta tipo="aviso">
                Atenção: o saldo fica negativo em {fluxo.diasNegativos} {fluxo.diasNegativos === 1 ? 'dia' : 'dias'} do período. O menor saldo é {formatarMoeda(fluxo.menorSaldo.saldo)} em {formatarData(fluxo.menorSaldo.data)}.
              </Alerta>
            ) : null}

            <Cartao titulo="Saldo projetado">
              <GraficoFluxo dias={fluxo.dias} />
            </Cartao>

            <Cartao titulo="O que fazer">
              {acoes.sugestoes.length === 0 ? (
                <p className="fluxo__texto">
                  {fluxo.diasNegativos === 0
                    ? 'O saldo não fica negativo no período. Não é preciso adiar nenhum pagamento.'
                    : 'O saldo fica negativo, mas não há saídas previstas para adiar. Considere antecipar entradas ou reduzir gastos.'}
                </p>
              ) : (
                <>
                  <ol className="fluxo__sugestoes" aria-label="Sugestões">
                    {acoes.sugestoes.map((s) => (
                      <li key={s.item.chave} data-origem-tipo={s.item.origem.tipo} data-origem-id={s.item.origem.id}>{s.texto}</li>
                    ))}
                  </ol>
                  {acoes.continuaNegativo ? (
                    <p className="fluxo__texto fluxo__negativo">Mesmo adiando esses itens, o saldo continua negativo em algum dia: antecipe entradas ou reduza gastos.</p>
                  ) : (
                    <p className="fluxo__texto">Com esses adiamentos, o saldo não fica negativo no período.</p>
                  )}
                </>
              )}
            </Cartao>

            <Cartao titulo="Dia a dia">
              {dias.length === 0 ? (
                <EstadoVazio titulo="Nenhum dia com movimento neste período">Desmarque o filtro para ver todos os dias.</EstadoVazio>
              ) : (
                <TabelaFluxo dias={dias} />
              )}
            </Cartao>
          </>
        )}
      </div>
    </div>
  );
}
