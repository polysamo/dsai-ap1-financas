import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AgendaLista } from '../components/agenda/AgendaLista';
import { AgendamentoForm } from '../components/agenda/AgendamentoForm';
import { AlertaVencimentos } from '../components/agenda/AlertaVencimentos';
import { BaixaForm } from '../components/agenda/BaixaForm';
import { CalendarioGrade } from '../components/agenda/CalendarioGrade';
import { ResumoAgenda } from '../components/agenda/ResumoAgenda';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Drawer } from '../ds/Drawer';
import { Alerta, Botao, Cartao, CampoTexto, EstadoVazio, TituloPagina } from '../components/ui';
import {
  agendamentosDoMes,
  alertaVencimentos,
  criarAgendamentos,
  excluirAgendamento,
  marcarComoPago,
  reabrirAgendamento,
  totaisAgenda,
} from '../domain/agenda';
import { formatarData, hojeISO, mesValido, nomeMes, somarMeses } from '../domain/date';
import type { Agendamento } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import '../components/agenda/agenda.css';

export function CalendarioPage() {
  const store = useStore();
  const estado = useEstado();
  const [params, setParams] = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);
  const [pagando, setPagando] = useState<Agendamento | null>(null);
  const [excluindo, setExcluindo] = useState<Agendamento | null>(null);
  const [novo, setNovo] = useState(false);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const hoje = hojeISO();

  const mesParam = params.get('mes') ?? '';
  const mes = mesValido(mesParam) ? mesParam : hoje.slice(0, 7);
  const itens = agendamentosDoMes(estado, mes);
  const nomesCategorias = new Map(estado.categorias.map((c) => [c.id, c.nome]));
  const irPara = (novo: string) => mesValido(novo) && setParams({ mes: novo }, { replace: true });

  const executar = (operacao: Parameters<typeof store.aplicar>[0], falhaMsg: string) => {
    const r = store.aplicar(operacao);
    setErro(r.ok ? null : r.erro || falhaMsg);
    return r.ok;
  };

  return (
    <div>
      <TituloPagina acoes={<Botao onClick={() => setNovo(true)}>Novo lançamento</Botao>}>Calendário</TituloPagina>
      <div className="agenda-pagina">
        {erro ? <Alerta>{erro}</Alerta> : null}

        <div className="agenda-faixa">
          <AlertaVencimentos alerta={alertaVencimentos(estado, hoje)} />
        </div>

        <Cartao>
          <div className="agenda-navegacao">
            <Botao variante="secundario" onClick={() => irPara(somarMeses(mes, -1))}>
              Mês anterior
            </Botao>
            <div className="agenda-navegacao-mes">
              <CampoTexto label="Mês" type="month" value={mes} onChange={(e) => irPara(e.target.value)} />
            </div>
            <Botao variante="secundario" onClick={() => irPara(somarMeses(mes, 1))}>
              Próximo mês
            </Botao>
          </div>
        </Cartao>

        <ResumoAgenda totais={totaisAgenda(itens)} />

        <Cartao titulo={nomeMes(mes)}>
          <CalendarioGrade mes={mes} itens={itens} hoje={hoje} onSelecionar={setDiaSel} />
        </Cartao>

        {pagando ? (
          <Cartao titulo={`Marcar como pago: ${pagando.descricao}`}>
            <BaixaForm
              key={pagando.id}
              item={pagando}
              categorias={estado.categorias}
              contas={estado.contas}
              onConfirmar={(dados) => {
                const r = store.aplicar((s) => marcarComoPago(s, pagando.id, dados));
                if (r.ok) {
                  setPagando(null);
                  setErro(null);
                }
                return r;
              }}
              onCancelar={() => setPagando(null)}
            />
          </Cartao>
        ) : null}

        <Cartao titulo="Lançamentos do mês">
          {estado.agenda.length === 0 ? (
            <EstadoVazio titulo="Nenhum lançamento agendado">Use o botão Novo lançamento para cadastrar contas a pagar e a receber e acompanhar os vencimentos.</EstadoVazio>
          ) : itens.length === 0 ? (
            <p className="agenda-texto-suave">Nenhum lançamento com vencimento neste mês.</p>
          ) : (
            <AgendaLista
              itens={itens}
              hoje={hoje}
              nomesCategorias={nomesCategorias}
              onPagar={(a) => setPagando(a)}
              onReabrir={(a) => executar((s) => reabrirAgendamento(s, a.id), 'Não foi possível reabrir o lançamento.')}
              onExcluir={(a) => setExcluindo(a)}
            />
          )}
        </Cartao>
      </div>

      <Drawer aberto={novo} titulo="Novo lançamento" onFechar={() => setNovo(false)}>
        <AgendamentoForm
          categorias={estado.categorias}
          contas={estado.contas}
          onSalvar={(dados) => {
            const r = store.aplicar((s) => criarAgendamentos(s, dados));
            if (r.ok) setNovo(false);
            return r;
          }}
        />
      </Drawer>

      <Drawer aberto={diaSel !== null} titulo={diaSel ? `Lançamentos de ${formatarData(diaSel)}` : ''} onFechar={() => setDiaSel(null)}>
        {diaSel && itens.filter((a) => a.vencimento === diaSel).length > 0 ? (
          <AgendaLista
            itens={itens.filter((a) => a.vencimento === diaSel)}
            hoje={hoje}
            nomesCategorias={nomesCategorias}
            onPagar={(a) => {
              setDiaSel(null);
              setPagando(a);
            }}
            onReabrir={(a) => executar((s) => reabrirAgendamento(s, a.id), 'Não foi possível reabrir o lançamento.')}
            onExcluir={(a) => {
              setDiaSel(null);
              setExcluindo(a);
            }}
          />
        ) : (
          <p className="agenda-texto-suave">Nenhum lançamento neste dia.</p>
        )}
      </Drawer>

      {excluindo ? (
        <ConfirmDialog
          titulo="Excluir lançamento"
          mensagem={`Excluir "${excluindo.descricao}"? A transação de um pagamento já feito não é apagada.`}
          rotuloConfirmar="Excluir"
          perigo
          onConfirmar={() => {
            const alvo = excluindo;
            setExcluindo(null);
            if (pagando?.id === alvo.id) setPagando(null);
            executar((s) => excluirAgendamento(s, alvo.id), 'Não foi possível excluir o lançamento.');
          }}
          onCancelar={() => setExcluindo(null)}
        />
      ) : null}
    </div>
  );
}
