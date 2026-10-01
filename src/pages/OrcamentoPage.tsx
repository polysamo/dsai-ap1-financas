import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LinhaOrcamentoItem } from '../components/LinhaOrcamentoItem';
import { Alerta, Botao, Cartao, CampoTexto, EstadoVazio, TituloPagina } from '../components/ui';
import { hojeISO, mesDe, mesValido, nomeMes, somarMeses } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import { copiarMesAnterior, definirLimite, linhasOrcamento, mesTemLimites, removerLimite, totaisOrcamento } from '../domain/orcamento';
import { useEstado, useStore } from '../state/store';

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
      <div className="space-y-4">
        <Cartao>
          <div className="flex flex-wrap items-end gap-3">
            <Botao variante="secundario" onClick={() => irPara(somarMeses(mes, -1))}>
              Mês anterior
            </Botao>
            <div className="w-44">
              <CampoTexto label="Mês" type="month" value={mes} onChange={(e) => mesValido(e.target.value) && irPara(e.target.value)} />
            </div>
            <Botao variante="secundario" onClick={() => irPara(somarMeses(mes, 1))}>
              Próximo mês
            </Botao>
            <p className="ml-auto text-lg font-semibold capitalize text-slate-800" aria-live="polite">
              {nomeMes(mes)}
            </p>
          </div>
        </Cartao>

        {erro ? <Alerta>{erro}</Alerta> : null}

        {podeCopiar ? (
          <Alerta tipo="aviso">
            <span className="flex flex-wrap items-center justify-between gap-2">
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
            <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Totais do mês">
              <Cartao>
                <p className="text-sm text-slate-600">Soma dos limites</p>
                <p className="text-xl font-bold" data-testid="total-limites">{formatarMoeda(totais.limites)}</p>
              </Cartao>
              <Cartao>
                <p className="text-sm text-slate-600">Gasto nas categorias com limite</p>
                <p className="text-xl font-bold" data-testid="total-gasto-com-limite">{formatarMoeda(totais.gastoComLimite)}</p>
              </Cartao>
              <Cartao>
                <p className="text-sm text-slate-600">Gasto sem orçamento</p>
                <p className="text-xl font-bold" data-testid="total-gasto-sem-orcamento">{formatarMoeda(totais.gastoSemOrcamento)}</p>
              </Cartao>
            </div>
            {estouradas > 0 ? (
              <Alerta>
                {estouradas === 1 ? '1 categoria estourou' : `${estouradas} categorias estouraram`} o limite neste mês.
              </Alerta>
            ) : null}
            <Cartao titulo="Limites por categoria">
              <ul className="divide-y divide-slate-200">
                {linhas.map((l) => (
                  <LinhaOrcamentoItem
                    key={l.categoria.id}
                    linha={l}
                    onDefinir={(limite) => store.aplicar((s) => definirLimite(s, l.categoria.id, mes, limite))}
                    onRemover={() => store.aplicar((s) => removerLimite(s, l.categoria.id, mes))}
                  />
                ))}
              </ul>
            </Cartao>
          </>
        )}
      </div>
    </div>
  );
}
