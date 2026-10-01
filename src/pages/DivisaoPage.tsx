import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DespesaForm } from '../components/divisao/DespesaForm';
import { GrupoForm } from '../components/divisao/GrupoForm';
import { Historico } from '../components/divisao/Historico';
import { ResumoGrupo } from '../components/divisao/ResumoGrupo';
import { SaldosAcerto } from '../components/divisao/SaldosAcerto';
import { Alerta, Botao, CampoSelect, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { formatarData, hojeISO } from '../domain/date';
import {
  csvGrupo,
  excluirAcerto,
  excluirDespesa,
  excluirGrupo,
  nomeArquivoGrupo,
  registrarAcerto,
  resumoGrupo,
  salvarDespesa,
  salvarGrupo,
  type DadosGrupo,
  type DespesaDivisao,
} from '../domain/divisao';
import { formatarMoeda } from '../domain/money';
import { ok, type Resultado } from '../domain/types';
import { baixarArquivo } from '../lib/download';
import { useEstado, useStore } from '../state/store';
import './DivisaoPage.css';

type Modo = 'ver' | 'novo' | 'editar';
type Pendente = { tipo: 'despesa'; id: string; descricao: string } | { tipo: 'acerto'; id: string; descricao: string } | { tipo: 'grupo' };

export function DivisaoPage() {
  const store = useStore();
  const estado = useEstado();
  const [params, setParams] = useSearchParams();
  const [modo, setModo] = useState<Modo>('ver');
  const [editando, setEditando] = useState<DespesaDivisao | null>(null);
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const hoje = hojeISO();

  const grupo = estado.gruposDivisao.find((g) => g.id === params.get('grupo')) ?? estado.gruposDivisao[0];
  const resumo = useMemo(() => (grupo ? resumoGrupo(grupo) : null), [grupo]);

  const salvarDadosGrupo = (dados: DadosGrupo): Resultado<void> => {
    let id = '';
    const r = store.aplicar((s) => {
      const x = salvarGrupo(s, dados);
      if (!x.ok) return x;
      id = x.valor.grupoId;
      return ok(x.valor.estado);
    });
    if (r.ok) {
      setParams({ grupo: id }, { replace: true });
      setModo('ver');
      setErro(null);
    }
    return r;
  };

  /** Ações sem formulário: o erro vai para o alerta da página. */
  const aplicar = (operacao: Parameters<typeof store.aplicar>[0]): boolean => {
    const r = store.aplicar(operacao);
    setErro(r.ok ? null : r.erro);
    return r.ok;
  };

  const confirmar = () => {
    if (!grupo || !pendente) return;
    if (pendente.tipo === 'grupo') {
      if (aplicar((s) => excluirGrupo(s, grupo.id))) setParams({}, { replace: true });
    } else if (pendente.tipo === 'despesa') {
      if (aplicar((s) => excluirDespesa(s, grupo.id, pendente.id)) && editando?.id === pendente.id) setEditando(null);
    } else {
      aplicar((s) => excluirAcerto(s, grupo.id, pendente.id));
    }
    setPendente(null);
  };

  const dialogo = pendente && grupo ? (
    <ConfirmDialog
      perigo
      titulo={pendente.tipo === 'grupo' ? 'Excluir grupo?' : pendente.tipo === 'despesa' ? 'Excluir despesa?' : 'Excluir acerto?'}
      mensagem={
        pendente.tipo === 'grupo'
          ? `O grupo "${grupo.nome}" e todas as suas despesas e acertos serão removidos.`
          : `"${pendente.descricao}" será removido e os saldos serão recalculados.`
      }
      rotuloConfirmar="Excluir"
      onConfirmar={confirmar}
      onCancelar={() => setPendente(null)}
    />
  ) : null;

  if (!grupo || !resumo) {
    return (
      <div className="divisao-pagina">
        <TituloPagina>Divisão</TituloPagina>
        <EstadoVazio titulo="Nenhum grupo de divisão">Crie um grupo (por exemplo, uma viagem) para dividir despesas entre amigos, sem sair do seu navegador.</EstadoVazio>
        <Cartao titulo="Novo grupo" className="divisao-pagina__bloco">
          <GrupoForm onSalvar={salvarDadosGrupo} />
        </Cartao>
      </div>
    );
  }

  return (
    <div className="divisao-pagina">
      <TituloPagina
        acoes={
          <div className="divisao-pagina__acoes">
            <Botao variante="secundario" onClick={() => setModo('novo')}>
              Novo grupo
            </Botao>
            <Botao variante="secundario" onClick={() => setModo('editar')}>
              Editar grupo
            </Botao>
            <Botao variante="secundario" onClick={() => baixarArquivo(nomeArquivoGrupo(grupo), csvGrupo(grupo), 'text/csv')}>
              Exportar CSV
            </Botao>
            <Botao variante="perigo" onClick={() => setPendente({ tipo: 'grupo' })}>
              Excluir grupo
            </Botao>
          </div>
        }
      >
        Divisão
      </TituloPagina>

      <div className="divisao-pagina__corpo">
        {erro ? <Alerta>{erro}</Alerta> : null}

        <Cartao>
          <CampoSelect
            label="Grupo"
            value={grupo.id}
            onChange={(e) => {
              setParams({ grupo: e.target.value }, { replace: true });
              setEditando(null);
              setModo('ver');
            }}
          >
            {estado.gruposDivisao.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </CampoSelect>
        </Cartao>

        {modo === 'novo' ? (
          <Cartao titulo="Novo grupo">
            <GrupoForm onSalvar={salvarDadosGrupo} onCancelar={() => setModo('ver')} />
          </Cartao>
        ) : null}
        {modo === 'editar' ? (
          <Cartao titulo={`Editar ${grupo.nome}`}>
            <GrupoForm key={grupo.id} inicial={grupo} onSalvar={salvarDadosGrupo} onCancelar={() => setModo('ver')} />
          </Cartao>
        ) : null}

        <Cartao titulo={`Resumo de ${grupo.nome}`}>
          <ResumoGrupo resumo={resumo} />
        </Cartao>

        <Cartao titulo="Saldos">
          <SaldosAcerto
            key={grupo.id}
            grupo={grupo}
            saldos={resumo.saldos}
            transferencias={resumo.transferencias}
            hoje={hoje}
            onAcerto={(dados) => store.aplicar((s) => registrarAcerto(s, grupo.id, dados))}
          />
        </Cartao>

        <Cartao titulo={editando ? `Editar despesa: ${editando.descricao}` : 'Nova despesa'}>
          <DespesaForm
            key={`${grupo.id}-${editando?.id ?? 'nova'}`}
            grupo={grupo}
            hoje={hoje}
            inicial={editando ?? undefined}
            onSalvar={(dados) => {
              const r = store.aplicar((s) => salvarDespesa(s, grupo.id, dados));
              if (r.ok) setEditando(null);
              return r;
            }}
            onCancelar={editando ? () => setEditando(null) : undefined}
          />
        </Cartao>

        <Cartao titulo="Histórico">
          <Historico
            key={grupo.id}
            grupo={grupo}
            onEditarDespesa={(d) => setEditando(d)}
            onExcluirDespesa={(d) => setPendente({ tipo: 'despesa', id: d.id, descricao: `${d.descricao} (${formatarMoeda(d.valor)}, ${formatarData(d.data)})` })}
            onExcluirAcerto={(a) => {
              const nome = (id: string) => grupo.participantes.find((p) => p.id === id)?.nome ?? '';
              setPendente({ tipo: 'acerto', id: a.id, descricao: `Acerto de ${formatarMoeda(a.valor)} de ${nome(a.deId)} a ${nome(a.paraId)}` });
            }}
          />
        </Cartao>
      </div>
      {dialogo}
    </div>
  );
}
