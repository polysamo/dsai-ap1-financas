import { useMemo, useState } from 'react';
import { DetalheBeneficiario } from '../components/beneficiarios/DetalheBeneficiario';
import { Alerta, CampoSelect, CampoTexto, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import {
  desfazerMescla,
  listarBeneficiarios,
  mesclarBeneficiario,
  PERIODOS_BENEFICIARIOS,
  renomearBeneficiario,
  type PeriodoBeneficiarios,
} from '../domain/beneficiarios';
import { hojeISO } from '../domain/date';
import { formatarMoeda, formatarPercentual } from '../domain/money';
import { normalizarTexto } from '../domain/transacoes';
import { ok, type AppState, type Resultado } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import '../components/beneficiarios/beneficiarios.css';

const ROTULO_PERIODO: Record<string, string> = { '1': 'Mês atual', '3': 'Últimos 3 meses', '6': 'Últimos 6 meses', '12': 'Últimos 12 meses', tudo: 'Todo o histórico' };

export function BeneficiariosPage() {
  const store = useStore();
  const estado = useEstado();
  const hoje = hojeISO();
  const [periodo, setPeriodo] = useState<PeriodoBeneficiarios>(12);
  const [filtro, setFiltro] = useState('');
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const todos = useMemo(() => listarBeneficiarios(estado, periodo, hoje), [estado, periodo, hoje]);
  const visiveis = filtro.trim() ? todos.filter((b) => normalizarTexto(b.nome).includes(normalizarTexto(filtro))) : todos;
  const atual = todos.find((b) => b.chave === selecionada) ?? null;

  const executar = (operacao: (s: AppState) => Resultado<AppState>, mensagem: string): Resultado<void> => {
    const r = store.aplicar(operacao);
    if (!r.ok) return r;
    setAviso(mensagem);
    return ok(undefined);
  };

  return (
    <div className="benef-pagina">
      <TituloPagina>Beneficiários</TituloPagina>
      {aviso ? <Alerta tipo="sucesso">{aviso}</Alerta> : null}
      <Cartao>
        <div className="benef-filtros">
          <CampoSelect label="Período" value={String(periodo)} onChange={(e) => setPeriodo(e.target.value === 'tudo' ? 'tudo' : (Number(e.target.value) as PeriodoBeneficiarios))}>
            {PERIODOS_BENEFICIARIOS.map((p) => (
              <option key={p} value={String(p)}>
                {ROTULO_PERIODO[String(p)]}
              </option>
            ))}
          </CampoSelect>
          <CampoTexto label="Filtrar pelo nome" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
      </Cartao>

      {todos.length === 0 ? (
        <EstadoVazio titulo="Nenhuma despesa com descrição no período">Os beneficiários são formados pela descrição das despesas. Registre ou importe despesas com descrição para ver para onde vai o dinheiro.</EstadoVazio>
      ) : (
        <div className="benef-colunas">
          <Cartao titulo={`${visiveis.length} ${visiveis.length === 1 ? 'beneficiário' : 'beneficiários'}`}>
            <ol className="benef-lista" aria-label="Beneficiários por total gasto">
              {visiveis.map((b) => (
                <li key={b.chave}>
                  <button type="button" className={`benef-item${atual?.chave === b.chave ? ' benef-item--ativo' : ''}`} aria-pressed={atual?.chave === b.chave} onClick={() => setSelecionada(b.chave)}>
                    <span className="benef-item__nome">{b.nome}</span>
                    <span className="benef-item__total tabular-nums">{formatarMoeda(b.total)}</span>
                    <span className="benef-item__meta">
                      {b.quantidade} {b.quantidade === 1 ? 'compra' : 'compras'} · {formatarPercentual(b.participacao)} das despesas
                    </span>
                    <span className="benef-item__barra" aria-hidden="true">
                      <span style={{ width: `${b.participacao ?? 0}%` }} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Cartao>
          {atual ? (
            <Cartao titulo={atual.nome}>
              <DetalheBeneficiario
                key={atual.chave}
                beneficiario={atual}
                outros={todos.filter((o) => o.chave !== atual.chave)}
                estado={estado}
                hoje={hoje}
                onRenomear={(nome) => executar((s) => renomearBeneficiario(s, atual.chave, nome), 'Nome salvo.')}
                onMesclar={(destino) => {
                  const r = executar((s) => mesclarBeneficiario(s, atual.chave, destino), `${atual.nome} foi mesclado.`);
                  if (r.ok) setSelecionada(destino);
                  return r;
                }}
                onDesfazerMescla={(origem) => executar((s) => desfazerMescla(s, origem), 'Mescla desfeita.')}
              />
            </Cartao>
          ) : (
            <p className="benef-dica">Escolha um beneficiário para ver o detalhe, renomear ou mesclar.</p>
          )}
        </div>
      )}
    </div>
  );
}
