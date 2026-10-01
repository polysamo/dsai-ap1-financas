import { useState, type FormEvent } from 'react';
import { Botao, CampoSelect, CampoTexto } from '../ui';
import type { DadosAcerto, GrupoDivisao, SaldoParticipante, Transferencia } from '../../domain/divisao';
import { formatarMoeda, parseValor } from '../../domain/money';
import type { Resultado } from '../../domain/types';
import './SaldosAcerto.css';

interface Props {
  grupo: GrupoDivisao;
  saldos: SaldoParticipante[];
  transferencias: Transferencia[];
  hoje: string;
  onAcerto: (dados: DadosAcerto) => Resultado<unknown>;
}

export function SaldosAcerto({ grupo, saldos, transferencias, hoje, onAcerto }: Props) {
  const nome = (id: string) => grupo.participantes.find((p) => p.id === id)?.nome ?? '';
  const [deId, setDeId] = useState(grupo.participantes[0].id);
  const [paraId, setParaId] = useState(grupo.participantes[1].id);
  const [valorTexto, setValorTexto] = useState('');
  const [data, setData] = useState(hoje);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroSugestao, setErroSugestao] = useState<string | null>(null);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const valor = parseValor(valorTexto);
    if (valor === null) return setErros({ valor: 'Informe um valor válido, como 25,90.' });
    const r = onAcerto({ deId, paraId, valor, data });
    if (!r.ok) return setErros({ [r.campo ?? 'geral']: r.erro });
    setErros({});
    setValorTexto('');
  };

  return (
    <div className="divisao-saldos">
      <ul className="divisao-saldos__lista" aria-label="Saldo por participante">
        {saldos.map((s) => (
          <li key={s.participanteId} className="divisao-saldos__item">
            <span className="divisao-saldos__nome">{s.nome}</span>
            <span className="divisao-saldos__detalhe">
              pagou {formatarMoeda(s.pagou)} · deve {formatarMoeda(s.deve)}
            </span>
            <span className={`divisao-saldos__situacao ${s.saldo > 0 ? 'divisao-saldos__situacao--recebe' : s.saldo < 0 ? 'divisao-saldos__situacao--deve' : ''}`}>
              {s.saldo > 0 ? `recebe ${formatarMoeda(s.saldo)}` : s.saldo < 0 ? `deve ${formatarMoeda(-s.saldo)}` : 'quitado'}
            </span>
          </li>
        ))}
      </ul>

      <h3 className="divisao-saldos__subtitulo">Acertar contas</h3>
      {erroSugestao ? (
        <p role="alert" className="divisao-saldos__erro">
          {erroSugestao}
        </p>
      ) : null}
      {transferencias.length === 0 ? (
        <p className="divisao-saldos__vazio">Todas as contas estão acertadas.</p>
      ) : (
        <ul className="divisao-saldos__sugestoes" aria-label="Transferências sugeridas">
          {transferencias.map((t) => {
            const texto = `${nome(t.deId)} paga ${formatarMoeda(t.valor)} a ${nome(t.paraId)}`;
            return (
              <li key={`${t.deId}-${t.paraId}`} className="divisao-saldos__sugestao">
                <span>{texto}</span>
                <Botao
                  variante="secundario"
                  aria-label={`Registrar acerto: ${texto}`}
                  onClick={() => {
                    const r = onAcerto({ deId: t.deId, paraId: t.paraId, valor: t.valor, data: hoje });
                    setErroSugestao(r.ok ? null : r.erro);
                  }}
                >
                  Registrar acerto
                </Botao>
              </li>
            );
          })}
        </ul>
      )}

      <form className="divisao-saldos__form" onSubmit={enviar} noValidate aria-label="Registrar pagamento entre participantes">
        <CampoSelect label="Quem pagou o acerto" value={deId} onChange={(e) => setDeId(e.target.value)} erro={erros.deId}>
          {grupo.participantes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect label="Quem recebeu" value={paraId} onChange={(e) => setParaId(e.target.value)} erro={erros.paraId}>
          {grupo.participantes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </CampoSelect>
        <CampoTexto label="Valor do acerto (R$)" inputMode="decimal" value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} erro={erros.valor} />
        <CampoTexto label="Data do acerto" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
        <Botao type="submit">Registrar pagamento</Botao>
        {erros.geral ? (
          <p role="alert" className="divisao-saldos__erro">
            {erros.geral}
          </p>
        ) : null}
      </form>
    </div>
  );
}
