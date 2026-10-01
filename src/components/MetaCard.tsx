import { useState } from 'react';
import { formatarData } from '../domain/date';
import { formatarMoeda, percentual } from '../domain/money';
import {
  acumulado,
  aporteMensalNecessario,
  arquivarMeta,
  editarAporte,
  editarMeta,
  excluirAporte,
  registrarAporte,
  reativarMeta,
  ritmoReal,
  situacaoRitmo,
} from '../domain/metas';
import type { Meta } from '../domain/types';
import { useStore } from '../state/store';
import { AporteForm } from './AporteForm';
import { Alerta, Botao, Cartao, Valor } from './ui';
import { MetaForm } from './MetaForm';
import './MetaCard.css';

type Modo = 'ver' | 'editar' | 'aportar' | 'historico';

export function MetaCard({ meta, hoje }: { meta: Meta; hoje: string }) {
  const store = useStore();
  const [modo, setModo] = useState<Modo>('ver');
  const [aporteEditandoId, setAporteEditandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const total = acumulado(meta);
  const pct = percentual(total, meta.valorAlvo);
  const falta = Math.max(meta.valorAlvo - total, 0);
  const necessario = aporteMensalNecessario(meta, hoje);
  const ritmo = situacaoRitmo(meta, hoje);
  const media = ritmoReal(meta, hoje);
  const arquivada = meta.status === 'arquivada';
  const aportesOrdenados = [...meta.aportes].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  const textoStatus = {
    ativa: 'Em andamento',
    concluida: meta.concluidaEm ? `Concluída em ${formatarData(meta.concluidaEm)}` : 'Concluída',
    arquivada: 'Arquivada',
  }[meta.status];

  const textoNecessario = (() => {
    switch (necessario.tipo) {
      case 'normal':
        return `Aporte mensal necessário: ${formatarMoeda(necessario.valor)} (${necessario.meses} meses)`;
      case 'ultimo-mes':
        return `Último mês: faltam ${formatarMoeda(necessario.valor)}`;
      case 'vencido':
        return `Prazo vencido: faltam ${formatarMoeda(necessario.valor)}`;
      default:
        return null;
    }
  })();

  const textoRitmo = ritmo
    ? {
        'no-ritmo': `No ritmo (média de ${formatarMoeda(media ?? 0)} por mês nos últimos 3 meses)`,
        'abaixo-do-ritmo': `Abaixo do ritmo (média de ${formatarMoeda(media ?? 0)} por mês nos últimos 3 meses)`,
        'sem-dados': 'Sem dados para estimar o ritmo',
      }[ritmo]
    : null;

  const executar = (op: Parameters<typeof store.aplicar>[0]) => {
    const r = store.aplicar(op);
    setErro(r.ok ? null : r.erro);
    return r;
  };

  return (
    <Cartao className={arquivada ? 'metas-cartao--arquivada' : ''}>
      <article aria-label={`Meta ${meta.nome}`}>
        <div className="metas-topo">
          <div className="metas-identificacao">
            <h2 className="metas-titulo">{meta.nome}</h2>
            <p className="metas-status" data-testid="status">
              {textoStatus}
              {meta.prazo ? ` · Prazo ${formatarData(meta.prazo)}` : ' · Sem prazo'}
            </p>
          </div>
          <p className="metas-valores">
            <span className="metas-acumulado" data-testid="acumulado">{formatarMoeda(total)}</span> de{' '}
            <span data-testid="alvo">{formatarMoeda(meta.valorAlvo)}</span>
          </p>
        </div>

        <div
          role="progressbar"
          aria-label={`Progresso da meta ${meta.nome}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(pct, 100)}
          className="metas-trilho"
        >
          <div className={`metas-barra${meta.status === 'concluida' ? ' metas-barra--concluida' : ''}`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
        </div>
        <div className="metas-progresso">
          <span data-testid="percentual">{pct}% alcançado</span>
          <span>
            Falta <span data-testid="falta">{formatarMoeda(falta)}</span>
          </span>
        </div>

        {!arquivada && (textoNecessario || textoRitmo) ? (
          <div className="metas-ritmo">
            {textoNecessario ? <p data-testid="necessario">{textoNecessario}</p> : null}
            {textoRitmo ? <p data-testid="ritmo">{textoRitmo}</p> : null}
          </div>
        ) : null}

        {erro ? (
          <div className="metas-erro">
            <Alerta>{erro}</Alerta>
          </div>
        ) : null}

        <div className="metas-acoes">
          {!arquivada ? (
            <Botao aria-label={`Registrar lançamento em ${meta.nome}`} onClick={() => setModo(modo === 'aportar' ? 'ver' : 'aportar')}>
              Registrar aporte ou retirada
            </Botao>
          ) : null}
          <Botao variante="secundario" aria-label={`Histórico de ${meta.nome}`} onClick={() => setModo(modo === 'historico' ? 'ver' : 'historico')}>
            Histórico ({meta.aportes.length})
          </Botao>
          <Botao variante="secundario" aria-label={`Editar meta ${meta.nome}`} onClick={() => setModo(modo === 'editar' ? 'ver' : 'editar')}>
            Editar meta
          </Botao>
          {arquivada ? (
            <Botao variante="secundario" aria-label={`Reativar meta ${meta.nome}`} onClick={() => executar((s) => reativarMeta(s, meta.id))}>
              Reativar
            </Botao>
          ) : (
            <Botao variante="secundario" aria-label={`Arquivar meta ${meta.nome}`} onClick={() => executar((s) => arquivarMeta(s, meta.id))}>
              Arquivar
            </Botao>
          )}
        </div>

        {modo === 'editar' ? (
          <div className="metas-painel">
            <MetaForm
              inicial={meta}
              onCancelar={() => setModo('ver')}
              onSalvar={(dados) => {
                const r = store.aplicar((s) => editarMeta(s, meta.id, dados, hoje));
                if (r.ok) setModo('ver');
                return r;
              }}
            />
          </div>
        ) : null}

        {modo === 'aportar' ? (
          <div className="metas-painel">
            <AporteForm
              rotulo={`Novo lançamento em ${meta.nome}`}
              onCancelar={() => setModo('ver')}
              onSalvar={(dados) => {
                const r = store.aplicar((s) => registrarAporte(s, meta.id, dados));
                if (r.ok) setModo('ver');
                return r;
              }}
            />
          </div>
        ) : null}

        {modo === 'historico' ? (
          <div className="metas-painel">
            {aportesOrdenados.length === 0 ? (
              <p className="metas-vazio">Nenhum lançamento ainda.</p>
            ) : (
              <ul className="metas-historico" aria-label={`Lançamentos de ${meta.nome}`}>
                {aportesOrdenados.map((a) =>
                  aporteEditandoId === a.id ? (
                    <li key={a.id} className="metas-aporte-edicao">
                      <AporteForm
                        inicial={a}
                        rotulo={`Editar lançamento de ${formatarData(a.data)}`}
                        onCancelar={() => setAporteEditandoId(null)}
                        onSalvar={(dados) => {
                          const r = store.aplicar((s) => editarAporte(s, meta.id, a.id, dados));
                          if (r.ok) setAporteEditandoId(null);
                          return r;
                        }}
                      />
                    </li>
                  ) : (
                    <li key={a.id} className="metas-aporte">
                      <span className="metas-aporte-data">
                        {formatarData(a.data)} · {a.valor < 0 ? 'Retirada' : 'Aporte'}
                      </span>
                      <span className="metas-aporte-acoes">
                        <Valor centavos={a.valor} texto={formatarMoeda(a.valor)} />
                        <Botao variante="secundario" aria-label={`Editar lançamento de ${formatarData(a.data)}`} onClick={() => setAporteEditandoId(a.id)}>
                          Editar
                        </Botao>
                        <Botao variante="perigo" aria-label={`Excluir lançamento de ${formatarData(a.data)}`} onClick={() => executar((s) => excluirAporte(s, meta.id, a.id))}>
                          Excluir
                        </Botao>
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        ) : null}
      </article>
    </Cartao>
  );
}
