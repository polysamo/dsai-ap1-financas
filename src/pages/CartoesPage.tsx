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

const ROTULO_SITUACAO: Record<SituacaoFatura, string> = { aberta: 'Aberta', fechada: 'Fechada', paga: 'Paga' };
const COR_SITUACAO: Record<SituacaoFatura, string> = {
  aberta: 'bg-sky-100 text-sky-900',
  fechada: 'bg-amber-100 text-amber-900',
  paga: 'bg-emerald-100 text-emerald-900',
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
        <EstadoVazio titulo="Nenhum cartão de crédito" acao={<Link to="/contas" className="font-medium text-emerald-800 underline">Criar um cartão em Contas</Link>}>
          Cadastre uma conta do tipo cartão de crédito para acompanhar faturas, limite e parcelas.
        </EstadoVazio>
      </div>
    );
  }

  return (
    <div>
      <TituloPagina>Cartões</TituloPagina>
      <div className="space-y-4">
        {erro ? <Alerta>{erro}</Alerta> : null}
        <Cartao>
          <div className="grid gap-3 sm:grid-cols-2">
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
          <EstadoVazio titulo="Cartão sem ciclo configurado" acao={<Link to="/contas" className="font-medium text-emerald-800 underline">Configurar em Contas</Link>}>
            Edite a conta "{escolhido.nome}" e informe o dia de fechamento, o dia de vencimento e o limite.
          </EstadoVazio>
        ) : (
          <>
            <Cartao titulo="Limite">
              <LimiteCartaoBarra limite={limite} total={escolhido.cartao.limite} />
            </Cartao>

            <Cartao>
              <div className="flex flex-wrap items-end gap-3">
                <Botao variante="secundario" onClick={() => navegar({ mes: somarMeses(mes, -1) })}>
                  Fatura anterior
                </Botao>
                <div className="w-44">
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
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR_SITUACAO[resumo.situacao]}`} data-testid="situacao">
                  {ROTULO_SITUACAO[resumo.situacao]}
                </span>
              }
            >
              <p className="mb-3 text-sm text-slate-600" data-testid="ciclo">
                Ciclo de {formatarData(cicloFatura(escolhido.cartao, mes).inicio)} a {formatarData(cicloFatura(escolhido.cartao, mes).fim)} · vence em{' '}
                <span data-testid="vencimento">{formatarData(resumo.vencimento)}</span>
              </p>
              <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-600">Total da fatura</dt>
                  <dd className="text-lg font-bold" data-testid="fatura-total">{formatarMoeda(resumo.total)}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">Pago</dt>
                  <dd data-testid="fatura-pago">{formatarMoeda(resumo.pago)}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">Restante</dt>
                  <dd data-testid="fatura-restante">{formatarMoeda(resumo.restante)}</dd>
                </div>
              </dl>
              {resumo.transacoes.length === 0 ? (
                <p className="text-sm text-slate-600">Nenhuma compra neste ciclo.</p>
              ) : (
                <ul className="divide-y divide-slate-200" aria-label="Compras da fatura">
                  {resumo.transacoes.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900">{t.descricao || 'Sem descrição'}</span>
                        <span className="text-xs text-slate-600">
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
                <ul className="mb-4 divide-y divide-slate-200" aria-label="Pagamentos registrados">
                  {pagamentos.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
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
                <p className="text-sm text-slate-600">Não há valor a pagar nesta fatura.</p>
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
