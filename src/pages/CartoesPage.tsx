import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CompraParceladaForm } from '../components/CompraParceladaForm';
import { LimiteCartaoBarra } from '../components/LimiteCartaoBarra';
import { PagamentoFaturaForm } from '../components/PagamentoFaturaForm';
import { Alerta, Botao, CampoSelect, CampoTexto, Cartao, EstadoVazio, TituloPagina, Valor } from '../components/ui';
import {
  cartoesAtivos,
  cicloFatura,
  criarCompraParcelada,
  excluirPagamento,
  limiteCartao,
  mesFaturaAberta,
  registrarPagamento,
  resumoFatura,
  type SituacaoFatura,
} from '../domain/cartoes';
import { formatarData, hojeISO, mesValido, nomeMes, somarMeses } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import { useEstado, useStore } from '../state/store';
import './CartoesPage.css';

const ROTULO_SITUACAO: Record<SituacaoFatura, string> = { aberta: 'Aberta', fechada: 'Fechada', paga: 'Paga' };
const COR_SITUACAO: Record<SituacaoFatura, string> = {
  aberta: 'cartoes__situacao--aberta',
  fechada: 'cartoes__situacao--fechada',
  paga: 'cartoes__situacao--paga',
};

export function CartoesPage() {
  const store = useStore();
  const estado = useEstado();
  const [params, setParams] = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);
  const hoje = hojeISO();

  const cartoes = cartoesAtivos(estado.contas);
  const escolhido = cartoes.find((c) => c.id === params.get('cartao')) ?? cartoes[0];
  const mesParam = params.get('mes') ?? '';
  const mes = mesValido(mesParam) ? mesParam : escolhido?.cartao ? mesFaturaAberta(escolhido.cartao, hoje) : hoje.slice(0, 7);

  const resumo = useMemo(() => (escolhido ? resumoFatura(estado, escolhido, mes, hoje) : null), [estado, escolhido, mes, hoje]);
  const limite = useMemo(() => (escolhido ? limiteCartao(estado, escolhido) : null), [estado, escolhido]);
  const categorias = new Map(estado.categorias.map((c) => [c.id, c.nome]));
  const pagamentos = estado.pagamentosFatura.filter((p) => escolhido && p.contaCartaoId === escolhido.id && p.mesFatura === mes);
  const contasOrigem = estado.contas.filter((c) => !c.arquivada && c.tipo !== 'cartao');
  const nomeConta = new Map(estado.contas.map((c) => [c.id, c.nome]));

  const navegar = (parcial: Record<string, string>) => setParams({ ...(escolhido ? { cartao: escolhido.id } : {}), mes, ...parcial }, { replace: true });

  if (!escolhido) {
    return (
      <div>
        <TituloPagina>Cartões</TituloPagina>
        <EstadoVazio titulo="Nenhum cartão de crédito" acao={<Link to="/contas" className="cartoes__link">Criar um cartão em Contas</Link>}>
          Cadastre uma conta do tipo cartão de crédito para acompanhar faturas, limite e parcelas.
        </EstadoVazio>
      </div>
    );
  }

  return (
    <div>
      <TituloPagina>Cartões</TituloPagina>
      <div className="cartoes">
        {erro ? <Alerta>{erro}</Alerta> : null}
        <Cartao>
          <div className="cartoes__seletor">
            <CampoSelect label="Cartão" value={escolhido.id} onChange={(e) => setParams({ cartao: e.target.value })}>
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </CampoSelect>
          </div>
        </Cartao>

        {!escolhido.cartao || !resumo || !limite ? (
          <EstadoVazio titulo="Cartão sem ciclo configurado" acao={<Link to="/contas" className="cartoes__link">Configurar em Contas</Link>}>
            Edite a conta "{escolhido.nome}" e informe o dia de fechamento, o dia de vencimento e o limite.
          </EstadoVazio>
        ) : (
          <>
            <Cartao titulo="Limite">
              <LimiteCartaoBarra limite={limite} total={escolhido.cartao.limite} />
            </Cartao>

            <Cartao>
              <div className="cartoes__navegacao">
                <Botao variante="secundario" onClick={() => navegar({ mes: somarMeses(mes, -1) })}>
                  Fatura anterior
                </Botao>
                <div className="cartoes__campo-mes">
                  <CampoTexto label="Mês da fatura" type="month" value={mes} onChange={(e) => mesValido(e.target.value) && navegar({ mes: e.target.value })} />
                </div>
                <Botao variante="secundario" onClick={() => navegar({ mes: somarMeses(mes, 1) })}>
                  Próxima fatura
                </Botao>
              </div>
            </Cartao>

            <Cartao
              titulo={`Fatura de ${nomeMes(mes)}`}
              acoes={
                <span className={`cartoes__situacao ${COR_SITUACAO[resumo.situacao]}`} data-testid="situacao">
                  {ROTULO_SITUACAO[resumo.situacao]}
                </span>
              }
            >
              <p className="cartoes__ciclo" data-testid="ciclo">
                Ciclo de {formatarData(cicloFatura(escolhido.cartao, mes).inicio)} a {formatarData(cicloFatura(escolhido.cartao, mes).fim)} · vence em{' '}
                <span data-testid="vencimento">{formatarData(resumo.vencimento)}</span>
              </p>
              <dl className="cartoes__fatura-resumo">
                <div>
                  <dt>Total da fatura</dt>
                  <dd className="cartoes__fatura-total" data-testid="fatura-total">{formatarMoeda(resumo.total)}</dd>
                </div>
                <div>
                  <dt>Pago</dt>
                  <dd data-testid="fatura-pago">{formatarMoeda(resumo.pago)}</dd>
                </div>
                <div>
                  <dt>Restante</dt>
                  <dd data-testid="fatura-restante">{formatarMoeda(resumo.restante)}</dd>
                </div>
              </dl>
              {resumo.transacoes.length === 0 ? (
                <p className="cartoes__texto-mudo">Nenhuma compra neste ciclo.</p>
              ) : (
                <ul className="cartoes__lista" aria-label="Compras da fatura">
                  {resumo.transacoes.map((t) => (
                    <li key={t.id} className="cartoes__item">
                      <span className="cartoes__item-texto">
                        <span className="cartoes__item-titulo">{t.descricao || 'Sem descrição'}</span>
                        <span className="cartoes__item-detalhe">
                          {formatarData(t.data)} · {categorias.get(t.categoriaId) ?? 'Sem categoria'}
                        </span>
                      </span>
                      <Valor centavos={t.tipo === 'despesa' ? -t.valor : t.valor} texto={formatarMoeda(t.tipo === 'despesa' ? -t.valor : t.valor)} />
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>

            <Cartao titulo="Pagamentos desta fatura">
              {pagamentos.length > 0 ? (
                <ul className="cartoes__lista cartoes__lista--espaco" aria-label="Pagamentos registrados">
                  {pagamentos.map((p) => (
                    <li key={p.id} className="cartoes__item">
                      <span>
                        {formatarData(p.data)} · de {nomeConta.get(p.contaOrigemId) ?? 'conta removida'} · {formatarMoeda(p.valor)}
                      </span>
                      <Botao
                        variante="secundario"
                        aria-label={`Excluir pagamento de ${formatarData(p.data)}`}
                        onClick={() => setErro(store.aplicar((s) => excluirPagamento(s, p.id)).ok ? null : 'Não foi possível excluir o pagamento.')}
                      >
                        Excluir
                      </Botao>
                    </li>
                  ))}
                </ul>
              ) : null}
              {resumo.restante > 0 ? (
                <PagamentoFaturaForm
                  key={`${escolhido.id}-${mes}-${resumo.restante}`}
                  contaCartaoId={escolhido.id}
                  mesFatura={mes}
                  restante={resumo.restante}
                  contasOrigem={contasOrigem}
                  onSalvar={(dados) => store.aplicar((s) => registrarPagamento(s, dados, hoje))}
                />
              ) : (
                <p className="cartoes__texto-mudo">Não há valor a pagar nesta fatura.</p>
              )}
            </Cartao>

            <Cartao titulo="Compra parcelada">
              <CompraParceladaForm contaId={escolhido.id} categorias={estado.categorias} onSalvar={(dados) => store.aplicar((s) => criarCompraParcelada(s, dados))} />
            </Cartao>
          </>
        )}
      </div>
    </div>
  );
}
