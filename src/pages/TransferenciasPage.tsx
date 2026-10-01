import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FILTRO_VAZIO, TransferenciasFiltros, type ValoresFiltro } from '../components/transferencias/TransferenciasFiltros';
import { TransferenciaForm } from '../components/transferencias/TransferenciaForm';
import { TransferenciasLista } from '../components/transferencias/TransferenciasLista';
import { TransferenciasTotais } from '../components/transferencias/TransferenciasTotais';
import { Alerta, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { ordenarContas } from '../domain/contas';
import { formatarData } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import {
  criarTransferencia,
  editarTransferencia,
  excluirTransferencia,
  filtrarTransferencias,
  listaTransferencias,
  totaisPorConta,
  validarPeriodo,
  type DadosTransferencia,
  type Transferencia,
} from '../domain/transferencias';
import { ok, type Resultado } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import './TransferenciasPage.css';

export function TransferenciasPage() {
  const store = useStore();
  const estado = useEstado();
  const [filtro, setFiltro] = useState<ValoresFiltro>(FILTRO_VAZIO);
  const [editando, setEditando] = useState<Transferencia | null>(null);
  const [excluindo, setExcluindo] = useState<Transferencia | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const todas = listaTransferencias(estado);
  const nomes = useMemo(() => new Map(estado.contas.map((c) => [c.id, c.nome])), [estado.contas]);
  const nomeConta = (id: string) => nomes.get(id) ?? 'Conta removida';
  const ativas = ordenarContas(estado.contas.filter((c) => !c.arquivada));

  const periodo = validarPeriodo(filtro.de || undefined, filtro.ate || undefined);
  const visiveis = useMemo(
    () =>
      filtrarTransferencias(todas, {
        contaId: filtro.contaId || undefined,
        // Com período inválido, só o filtro de conta vale; o erro aparece junto ao campo.
        ...(periodo.ok ? { de: filtro.de || undefined, ate: filtro.ate || undefined } : {}),
      }),
    [todas, filtro, periodo.ok],
  );
  const totais = useMemo(() => totaisPorConta(visiveis), [visiveis]);

  const contasDaEdicao = editando
    ? ordenarContas(estado.contas.filter((c) => !c.arquivada || c.id === editando.contaOrigemId || c.id === editando.contaDestinoId))
    : ativas;

  const salvar = (dados: DadosTransferencia): Resultado<void> => {
    const r = store.aplicar((s) => (editando ? editarTransferencia(s, editando.id, dados) : criarTransferencia(s, dados)));
    if (!r.ok) return r;
    setAviso({ tipo: 'sucesso', texto: editando ? 'Transferência atualizada.' : 'Transferência registrada.' });
    setEditando(null);
    return ok(undefined);
  };

  const confirmarExclusao = () => {
    if (!excluindo) return;
    const r = store.aplicar((s) => excluirTransferencia(s, excluindo.id));
    setAviso(r.ok ? { tipo: 'sucesso', texto: 'Transferência excluída.' } : { tipo: 'erro', texto: r.erro });
    setExcluindo(null);
  };

  return (
    <div>
      <TituloPagina>Transferências</TituloPagina>
      <div className="transf-pagina">
        {aviso ? <Alerta tipo={aviso.tipo === 'sucesso' ? 'sucesso' : 'erro'}>{aviso.texto}</Alerta> : null}

        <Cartao titulo={editando ? 'Editar transferência' : 'Nova transferência'}>
          <TransferenciaForm
            key={editando?.id ?? 'nova'}
            contas={contasDaEdicao}
            transferencia={editando ?? undefined}
            onSalvar={salvar}
            onCancelar={editando ? () => setEditando(null) : undefined}
          />
        </Cartao>

        <Cartao titulo="Filtros">
          <TransferenciasFiltros contas={ordenarContas(estado.contas)} valores={filtro} erroPeriodo={periodo.ok ? undefined : periodo.erro} onChange={setFiltro} />
        </Cartao>

        <Cartao titulo="Totais por conta">
          <TransferenciasTotais totais={totais} nomeConta={nomeConta} />
        </Cartao>

        <Cartao titulo="Histórico">
          {todas.length === 0 ? (
            <EstadoVazio titulo="Nenhuma transferência registrada">Use o formulário acima para mover dinheiro entre duas contas.</EstadoVazio>
          ) : visiveis.length === 0 ? (
            <p className="transf-sem-resultado">Nenhuma transferência encontrada com esses filtros.</p>
          ) : (
            <TransferenciasLista transferencias={visiveis} nomeConta={nomeConta} onEditar={setEditando} onExcluir={setExcluindo} />
          )}
        </Cartao>
      </div>

      {excluindo ? (
        <ConfirmDialog
          titulo="Excluir transferência"
          mensagem={`Excluir a transferência de ${formatarMoeda(excluindo.valor)} de ${nomeConta(excluindo.contaOrigemId)} para ${nomeConta(excluindo.contaDestinoId)} em ${formatarData(excluindo.data)}? Os saldos voltam ao que eram.`}
          rotuloConfirmar="Excluir"
          perigo
          onConfirmar={confirmarExclusao}
          onCancelar={() => setExcluindo(null)}
        />
      ) : null}
    </div>
  );
}
