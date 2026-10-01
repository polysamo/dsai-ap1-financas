import { useState } from 'react';
import { MetaCard } from '../components/MetaCard';
import { MetaForm } from '../components/MetaForm';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/EmptyState';
import { Botao, TituloPagina } from '../components/ui';
import { hojeISO } from '../domain/date';
import { criarMeta, ordenarMetas } from '../domain/metas';
import { useEstado, useStore } from '../state/store';
import './MetasPage.css';

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
      <TituloPagina acoes={<Botao onClick={() => setCriando(true)}>Nova meta</Botao>}>Metas</TituloPagina>
      <div className="metas-pagina">
        <Drawer aberto={criando} titulo="Nova meta" onFechar={() => setCriando(false)}>
            <MetaForm
              onCancelar={() => setCriando(false)}
              onSalvar={(dados) => {
                const r = store.aplicar((s) => criarMeta(s, dados, hoje));
                if (r.ok) setCriando(false);
                return r;
              }}
            />
        </Drawer>

        {arquivadas.length > 0 ? (
          <label className="metas-filtro-arquivadas">
            <input type="checkbox" checked={mostrarArquivadas} onChange={(e) => setMostrarArquivadas(e.target.checked)} />
            Mostrar metas arquivadas ({arquivadas.length})
          </label>
        ) : null}

        {visiveis.length === 0 ? (
          <EmptyState titulo="Nenhuma meta ainda" descricao="Defina um objetivo de poupança e acompanhe seus aportes." acaoRotulo="Crie sua primeira meta" onAcao={() => setCriando(true)} />
        ) : null}

        {visiveis.map((m) => (
          <MetaCard key={m.id} meta={m} hoje={hoje} />
        ))}
      </div>
    </div>
  );
}
