import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CartaoDesafio } from '../components/desafios/CartaoDesafio';
import { DesafioForm } from '../components/desafios/DesafioForm';
import { Alerta, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { hojeISO } from '../domain/date';
import {
  abandonarDesafio,
  alternarSemana,
  criarDesafio,
  excluirDesafio,
  listaDesafios,
  separarDesafios,
  situacaoDesafio,
  type Desafio,
} from '../domain/desafios';
import { ok, type AppState, type Resultado } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import '../components/desafios/desafios.css';

type Confirmacao = { tipo: 'abandonar' | 'excluir'; desafio: Desafio };

export function DesafiosPage() {
  const store = useStore();
  const estado = useEstado();
  const hoje = hojeISO();
  const { ativos, encerrados } = separarDesafios(estado, hoje);
  const [confirmando, setConfirmando] = useState<Confirmacao | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const executar = (operacao: (s: AppState) => Resultado<AppState>, mensagem?: string): Resultado<void> => {
    const r = store.aplicar(operacao);
    if (!r.ok) {
      setAviso({ tipo: 'erro', texto: r.erro });
      return r;
    }
    if (mensagem) setAviso({ tipo: 'sucesso', texto: mensagem });
    return ok(undefined);
  };

  const cartao = (d: Desafio) => (
    <CartaoDesafio
      key={d.id}
      desafio={d}
      situacao={situacaoDesafio(estado, d, hoje)}
      estado={estado}
      hoje={hoje}
      onAlternarSemana={(n) => executar((s) => alternarSemana(s, d.id, n))}
      onAbandonar={() => setConfirmando({ tipo: 'abandonar', desafio: d })}
      onExcluir={() => setConfirmando({ tipo: 'excluir', desafio: d })}
    />
  );

  return (
    <div className="desafios-pagina">
      <TituloPagina>Desafios de economia</TituloPagina>
      {aviso ? <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta> : null}
      <Cartao titulo="Novo desafio">
        <DesafioForm
          categorias={estado.categorias}
          onSalvar={(dados) => {
            const r = store.aplicar((s) => criarDesafio(s, dados));
            if (r.ok) setAviso({ tipo: 'sucesso', texto: 'Desafio criado. Boa sorte!' });
            return r;
          }}
        />
      </Cartao>

      {listaDesafios(estado).length === 0 ? (
        <EstadoVazio titulo="Nenhum desafio ainda">
          Escolha um tipo: no desafio das 52 semanas você guarda um valor que cresce a cada semana e marca as semanas feitas; em "dias sem gastar" o app confere sozinho se houve despesa nas categorias escolhidas; no "teto de gastos" ele acompanha quanto ainda cabe numa categoria até o fim do período.
        </EstadoVazio>
      ) : null}

      {ativos.length > 0 ? (
        <section aria-label="Ativos" className="desafios-secao">
          <h2 className="desafios-secao__titulo">Ativos</h2>
          <div className="desafios-grade">{ativos.map(cartao)}</div>
        </section>
      ) : null}
      {encerrados.length > 0 ? (
        <section aria-label="Encerrados" className="desafios-secao">
          <h2 className="desafios-secao__titulo">Encerrados</h2>
          <div className="desafios-grade">{encerrados.map(cartao)}</div>
        </section>
      ) : null}

      {confirmando ? (
        <ConfirmDialog
          titulo={confirmando.tipo === 'abandonar' ? 'Abandonar desafio' : 'Excluir desafio'}
          mensagem={confirmando.tipo === 'abandonar' ? `Abandonar "${confirmando.desafio.nome}"? Ele vai para Encerrados.` : `Excluir "${confirmando.desafio.nome}"? As transações não mudam.`}
          rotuloConfirmar={confirmando.tipo === 'abandonar' ? 'Abandonar' : 'Excluir'}
          perigo
          onCancelar={() => setConfirmando(null)}
          onConfirmar={() => {
            const { tipo, desafio } = confirmando;
            executar((s) => (tipo === 'abandonar' ? abandonarDesafio(s, desafio.id, hoje) : excluirDesafio(s, desafio.id)), tipo === 'abandonar' ? 'Desafio abandonado.' : 'Desafio excluído.');
            setConfirmando(null);
          }}
        />
      ) : null}
    </div>
  );
}
