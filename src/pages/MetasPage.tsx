import { useState } from 'react';
import { MetaCard } from '../components/MetaCard';
import { MetaForm } from '../components/MetaForm';
import { Botao, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { hojeISO } from '../domain/date';
import { criarMeta, ordenarMetas } from '../domain/metas';
import { useEstado, useStore } from '../state/store';

export function MetasPage() {
  const store = useStore();
  const estado = useEstado();
  const [criando, setCriando] = useState(false);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const hoje = hojeISO();

  const arquivadas = estado.metas.filter((m) => m.status === 'arquivada');
  const visiveis = ordenarMetas(estado.metas.filter((m) => mostrarArquivadas || m.status !== 'arquivada'));

  return (
    <div>
      <TituloPagina acoes={!criando ? <Botao onClick={() => setCriando(true)}>Nova meta</Botao> : undefined}>Metas</TituloPagina>
      <div className="space-y-4">
        {criando ? (
          <Cartao titulo="Nova meta">
            <MetaForm
              onCancelar={() => setCriando(false)}
              onSalvar={(dados) => {
                const r = store.aplicar((s) => criarMeta(s, dados, hoje));
                if (r.ok) setCriando(false);
                return r;
              }}
            />
          </Cartao>
        ) : null}

        {arquivadas.length > 0 ? (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={mostrarArquivadas} onChange={(e) => setMostrarArquivadas(e.target.checked)} className="h-4 w-4 accent-emerald-700" />
            Mostrar metas arquivadas ({arquivadas.length})
          </label>
        ) : null}

        {visiveis.length === 0 && !criando ? (
          <EstadoVazio titulo="Nenhuma meta ainda" acao={<Botao onClick={() => setCriando(true)}>Crie sua primeira meta</Botao>}>
            Defina um objetivo de poupança, como uma reserva de emergência ou uma viagem, e acompanhe seus aportes.
          </EstadoVazio>
        ) : null}

        {visiveis.map((m) => (
          <MetaCard key={m.id} meta={m} hoje={hoje} />
        ))}
      </div>
    </div>
  );
}
