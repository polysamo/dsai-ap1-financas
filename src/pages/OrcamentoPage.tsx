import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LinhaOrcamentoItem } from '../components/LinhaOrcamentoItem';
import { Alerta, Botao, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { KpiCard, MonthPicker } from '../components/novos';
import { hojeISO, mesDe, mesValido, somarMeses } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import { copiarMesAnterior, definirLimite, linhasOrcamento, mesTemLimites, removerLimite, totaisOrcamento } from '../domain/orcamento';
import { useEstado } from '../state/store';
import { useFeedback } from '../state/useFeedback';
import { useAtalhoNovo } from '../lib/atalhos';
import './OrcamentoPage.css';

export function OrcamentoPage() {
  const estado = useEstado();
  const [params, setParams] = useSearchParams();
  const { executar, erro } = useFeedback();

  const mesParam = params.get('mes') ?? '';
  const mes = mesValido(mesParam) ? mesParam : mesDe(hojeISO());
  const irPara = (novo: string) => setParams({ mes: novo }, { replace: true });

  const linhas = useMemo(() => linhasOrcamento(estado, mes), [estado, mes]);
  const totais = useMemo(() => totaisOrcamento(linhas), [linhas]);
  const semLimites = !mesTemLimites(estado, mes);
  const podeCopiar = semLimites && mesTemLimites(estado, somarMeses(mes, -1));
  const estouradas = linhas.filter((l) => l.estado === 'estourado').length;
  const abrirPrimeiroLimite = useCallback(() => {
    const botao = document.querySelector<HTMLButtonElement>('[aria-label^="Definir limite de"], [aria-label^="Editar limite de"]');
    botao?.click();
    setTimeout(() => document.querySelector<HTMLInputElement>('form[aria-label^="Limite de"] input')?.focus());
  }, []);
  useAtalhoNovo(abrirPrimeiroLimite);

  return (
    <div>
      <TituloPagina descricao="Compare limites mensais e gastos por categoria para decidir onde ajustar." acoes={<Botao onClick={abrirPrimeiroLimite}>Definir limite</Botao>}>Orçamento</TituloPagina>
      <div className="orcamento-pagina">
        <MonthPicker mes={mes} onChange={irPara} />

        {podeCopiar ? (
          <Alerta tipo="aviso">
            <span className="orcamento-aviso">
              Este mês ainda não tem limites. Quer copiar os do mês anterior?
              <Botao
                variante="secundario"
                onClick={() => {
                  executar((s) => copiarMesAnterior(s, mes), 'Limites copiados do mês anterior.');
                }}
              >
                Copiar limites do mês anterior
              </Botao>
            </span>
          </Alerta>
        ) : null}

        {linhas.length === 0 ? (
          <EstadoVazio titulo="Nenhuma categoria de despesa" acao={<Link to="/transacoes" className="orcamento-link-acao">Ir para Transações</Link>}>Crie categorias de despesa na tela Transações para definir limites.</EstadoVazio>
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
                        onDefinir={(limite) => executar((s) => definirLimite(s, l.categoria.id, mes, limite), 'Limite salvo.')}
                        onRemover={() => executar((s) => removerLimite(s, l.categoria.id, mes), 'Limite removido.')}
                        onErro={erro}
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
