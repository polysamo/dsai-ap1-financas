import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LinhaOrcamentoItem } from '../components/LinhaOrcamentoItem';
import { Alerta, Botao, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { KpiCard, MonthPicker } from '../components/novos';
import { hojeISO, mesDe, mesValido, somarMeses } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import { copiarMesAnterior, definirLimite, linhasOrcamento, mesTemLimites, removerLimite, totaisOrcamento } from '../domain/orcamento';
import { useEstado, useStore } from '../state/store';
import './OrcamentoPage.css';

export function OrcamentoPage() {
  const store = useStore();
  const estado = useEstado();
  const [params, setParams] = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);

  const mesParam = params.get('mes') ?? '';
  const mes = mesValido(mesParam) ? mesParam : mesDe(hojeISO());
  const irPara = (novo: string) => setParams({ mes: novo }, { replace: true });

  const linhas = useMemo(() => linhasOrcamento(estado, mes), [estado, mes]);
  const totais = useMemo(() => totaisOrcamento(linhas), [linhas]);
  const semLimites = !mesTemLimites(estado, mes);
  const podeCopiar = semLimites && mesTemLimites(estado, somarMeses(mes, -1));
  const estouradas = linhas.filter((l) => l.estado === 'estourado').length;

  return (
    <div>
      <TituloPagina>Orçamento</TituloPagina>
      <div className="orcamento-pagina">
        <MonthPicker mes={mes} onChange={irPara} />

        {erro ? <Alerta>{erro}</Alerta> : null}

        {podeCopiar ? (
          <Alerta tipo="aviso">
            <span className="orcamento-aviso">
              Este mês ainda não tem limites. Quer copiar os do mês anterior?
              <Botao
                variante="secundario"
                onClick={() => {
                  const r = store.aplicar((s) => copiarMesAnterior(s, mes));
                  setErro(r.ok ? null : r.erro);
                }}
              >
                Copiar limites do mês anterior
              </Botao>
            </span>
          </Alerta>
        ) : null}

        {linhas.length === 0 ? (
          <EstadoVazio titulo="Nenhuma categoria de despesa">Crie categorias de despesa na tela Transações para definir limites.</EstadoVazio>
        ) : (
          <>
            <div className="orcamento-totais" role="group" aria-label="Totais do mês">
              <KpiCard rotulo="Soma dos limites" valor={<span data-testid="total-limites">{formatarMoeda(totais.limites)}</span>} />
              <KpiCard rotulo="Gasto nas categorias com limite" valor={<span data-testid="total-gasto-com-limite">{formatarMoeda(totais.gastoComLimite)}</span>} />
              <KpiCard rotulo="Gasto sem orçamento" valor={<span data-testid="total-gasto-sem-orcamento">{formatarMoeda(totais.gastoSemOrcamento)}</span>} />
            </div>
            {estouradas > 0 ? (
              <Alerta>
                {estouradas === 1 ? '1 categoria estourou' : `${estouradas} categorias estouraram`} o limite neste mês.
              </Alerta>
            ) : null}
            {[
              { titulo: 'Com limite', itens: linhas.filter((l) => l.limite !== null) },
              { titulo: 'Sem limite', itens: linhas.filter((l) => l.limite === null) },
            ]
              .filter((g) => g.itens.length > 0)
              .map((g) => (
                <Cartao key={g.titulo} titulo={g.titulo === 'Com limite' ? 'Limites por categoria' : 'Sem limite definido'}>
                  <ul className="orcamento-lista">
                    {g.itens.map((l) => (
                      <LinhaOrcamentoItem
                        key={l.categoria.id}
                        linha={l}
                        onDefinir={(limite) => store.aplicar((s) => definirLimite(s, l.categoria.id, mes, limite))}
                        onRemover={() => store.aplicar((s) => removerLimite(s, l.categoria.id, mes))}
                      />
                    ))}
                  </ul>
                </Cartao>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
