import { nomeMes } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import type { Projecao } from '../domain/projecao';
import type { Categoria } from '../domain/types';
import { Alerta, Cartao, Valor } from './ui';

export function ProjecaoCard({ projecao, categorias }: { projecao: Projecao; categorias: Categoria[] }) {
  if (projecao.tipo === 'sem-dados') {
    return (
      <Cartao titulo="Projeção do saldo">
        <p className="text-sm text-slate-700" data-testid="projecao-vazia">
          Ainda não há um mês completo de transações nem recorrências ativas para projetar. Registre transações ou cadastre recorrências abaixo.
        </p>
      </Cartao>
    );
  }
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  const n = projecao.mesesBase.length;
  return (
    <Cartao titulo="Projeção do saldo">
      <p className="mb-3 text-sm text-slate-700">
        Estimativa para os próximos 6 meses, não uma garantia. Parte do saldo atual de <strong>{formatarMoeda(projecao.saldoAtual)}</strong> e soma o efeito mensal abaixo a cada mês.
      </p>
      <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-slate-600">Média de receitas</dt>
          <dd data-testid="media-receitas">{formatarMoeda(projecao.mediaReceitas)}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Média de despesas</dt>
          <dd data-testid="media-despesas">{formatarMoeda(projecao.mediaDespesas)}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Recorrências (receitas − despesas)</dt>
          <dd data-testid="recorrencias-liquido">{formatarMoeda(projecao.receitasRecorrentes - projecao.despesasRecorrentes)}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Efeito mensal</dt>
          <dd data-testid="efeito-mensal">
            <Valor centavos={projecao.efeitoMensal} texto={formatarMoeda(projecao.efeitoMensal)} />
          </dd>
        </div>
      </dl>
      <p className="mb-3 text-xs text-slate-600" data-testid="base-projecao">
        {n === 0
          ? 'Sem meses completos de histórico: a projeção usa apenas as recorrências.'
          : `Médias calculadas com ${n} ${n === 1 ? 'mês completo' : 'meses completos'} (${projecao.mesesBase.map(nomeMes).join(', ')}).`}
        {projecao.categoriasCobertas.length > 0
          ? ` Categorias com recorrência ativa, fora das médias: ${projecao.categoriasCobertas.map((id) => nomes.get(id) ?? id).join(', ')}.`
          : ''}
      </p>
      {projecao.primeiroNegativo ? (
        <div className="mb-3">
          <Alerta tipo="aviso">
            <span data-testid="aviso-negativo">Atenção: o saldo projetado fica negativo a partir de {nomeMes(projecao.primeiroNegativo)}.</span>
          </Alerta>
        </div>
      ) : null}
      <table className="w-full text-left text-sm" aria-label="Saldo projetado por mês">
        <thead>
          <tr className="text-slate-600">
            <th scope="col" className="py-1 font-medium">Fim de</th>
            <th scope="col" className="py-1 text-right font-medium">Saldo estimado</th>
          </tr>
        </thead>
        <tbody>
          {projecao.meses.map((p) => (
            <tr key={p.mes} className="border-t border-slate-200" data-testid={`projecao-${p.mes}`}>
              <th scope="row" className="py-1 font-normal capitalize">{nomeMes(p.mes)}</th>
              <td className="py-1 text-right">
                <Valor centavos={p.saldo} texto={formatarMoeda(p.saldo)} />
                {p.saldo < 0 ? <span className="ml-1 text-xs text-red-800">(negativo)</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Cartao>
  );
}
