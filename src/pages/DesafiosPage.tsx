import { useCallback, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CartaoDesafio } from '../components/desafios/CartaoDesafio';
import { DesafioForm } from '../components/desafios/DesafioForm';
import { Botao, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { formatarMoeda } from '../domain/money';
import { useAtalhoNovo } from '../lib/atalhos';
import { useFeedback } from '../state/useFeedback';
import { hojeISO } from '../domain/date';
import {
  abandonarDesafio,
  alternarSemana,
  criarDesafio,
  excluirDesafio,
  listaDesafios,
  separarDesafios,
  situacaoDesafio,
  valorDaSemana,
  type Desafio,
} from '../domain/desafios';
import { useEstado, useStore } from '../state/store';
import '../components/desafios/desafios.css';

type Confirmacao = { tipo: 'abandonar' | 'excluir'; desafio: Desafio };

export function DesafiosPage() {
  const store = useStore();
  const estado = useEstado();
  const hoje = hojeISO();
  const { ativos, encerrados } = separarDesafios(estado, hoje);
  const [confirmando, setConfirmando] = useState<Confirmacao | null>(null);
  const { executar, sucesso } = useFeedback();

  /** Leva o foco ao primeiro campo do formulário de novo desafio. */
  const irParaFormulario = useCallback(() => {
    document.querySelector<HTMLSelectElement>('form[aria-label="Novo desafio"] select')?.focus();
  }, []);
  useAtalhoNovo(irParaFormulario);

  const cartao = (d: Desafio) => (
    <CartaoDesafio
      key={d.id}
      desafio={d}
      situacao={situacaoDesafio(estado, d, hoje)}
      estado={estado}
      hoje={hoje}
      onAlternarSemana={(n) => {
        const feita = d.tipo === 'semanas52' && d.semanasFeitas.includes(n);
        const valor = d.tipo === 'semanas52' ? formatarMoeda(valorDaSemana(d, n)) : '';
        executar((s) => alternarSemana(s, d.id, n), feita ? `Semana ${n} desmarcada.` : `Semana ${n} marcada: ${valor} guardados.`);
      }}
      onAbandonar={() => setConfirmando({ tipo: 'abandonar', desafio: d })}
      onExcluir={() => setConfirmando({ tipo: 'excluir', desafio: d })}
    />
  );

  return (
    <div className="desafios-pagina">
      <TituloPagina descricao="Metas curtas para criar o hábito de economizar: guarde semana a semana, passe dias sem gastar ou segure o teto de uma categoria." acoes={<Botao onClick={irParaFormulario}>Novo desafio</Botao>}>
        Desafios de economia
      </TituloPagina>
      <Cartao titulo="Novo desafio">
        <DesafioForm
          categorias={estado.categorias}
          onSalvar={(dados) => {
            const r = store.aplicar((s) => criarDesafio(s, dados));
            if (r.ok) sucesso('Desafio criado. Boa sorte!', true);
            return r;
          }}
        />
      </Cartao>

      {listaDesafios(estado).length === 0 ? (
        <EstadoVazio titulo="Nenhum desafio ainda" acao={<Botao onClick={irParaFormulario}>Criar meu primeiro desafio</Botao>}>
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
