import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { hojeISO } from '../../domain/date';
import { parseValor, valorParaCampo } from '../../domain/money';
import { DESCRICAO_TRANSFERENCIA_MAX, type DadosTransferencia, type Transferencia } from '../../domain/transferencias';
import type { Conta, Resultado } from '../../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from '../ui';
import './TransferenciaForm.css';

interface Props {
  /** Contas que podem ser escolhidas (ativas, mais as já usadas pela transferência editada). */
  contas: Conta[];
  /** Presente ao editar. */
  transferencia?: Transferencia;
  onSalvar: (dados: DadosTransferencia) => Resultado<void>;
  onCancelar?: () => void;
}

type Campo = 'contaOrigemId' | 'contaDestinoId' | 'valor' | 'data' | 'descricao' | 'geral';
type Erros = Partial<Record<Campo, string>>;

export function TransferenciaForm({ contas, transferencia, onSalvar, onCancelar }: Props) {
  const [origem, setOrigem] = useState(transferencia?.contaOrigemId ?? contas[0]?.id ?? '');
  const [destino, setDestino] = useState(transferencia?.contaDestinoId ?? contas[1]?.id ?? '');
  const [valor, setValor] = useState(transferencia ? valorParaCampo(transferencia.valor) : '');
  const [data, setData] = useState(transferencia?.data ?? hojeISO());
  const [descricao, setDescricao] = useState(transferencia?.descricao ?? '');
  const [erros, setErros] = useState<Erros>({});

  if (contas.length < 2) {
    return (
      <Alerta tipo="aviso">
        Para transferir é preciso ter ao menos duas contas ativas. <Link to="/contas">Ir para Contas</Link>
      </Alerta>
    );
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(valor);
    if (centavos === null) return setErros({ valor: 'Informe um valor válido, como 350,00.' });
    const r = onSalvar({ contaOrigemId: origem, contaDestinoId: destino, valor: centavos, data, descricao });
    if (!r.ok) return setErros({ [r.campo ?? 'geral']: r.erro });
    setErros({});
    if (!transferencia) {
      setValor('');
      setDescricao('');
    }
  };

  return (
    <form onSubmit={enviar} noValidate aria-label={transferencia ? 'Editar transferência' : 'Nova transferência'} className="transf-form">
      <CampoSelect label="Conta de origem" value={origem} onChange={(e) => setOrigem(e.target.value)} erro={erros.contaOrigemId}>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelect>
      <CampoSelect label="Conta de destino" value={destino} onChange={(e) => setDestino(e.target.value)} erro={erros.contaDestinoId}>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelect>
      <CampoTexto label="Valor" value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valor} inputMode="decimal" placeholder="0,00" />
      <CampoTexto label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
      <div className="transf-form-larga">
        <CampoTexto
          label="Descrição (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          erro={erros.descricao}
          maxLength={DESCRICAO_TRANSFERENCIA_MAX + 20}
          autoComplete="off"
        />
      </div>
      {erros.geral ? (
        <div className="transf-form-larga">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="transf-form-larga transf-form-acoes">
        <Botao type="submit">{transferencia ? 'Salvar alterações' : 'Registrar transferência'}</Botao>
        {onCancelar ? (
          <Botao variante="secundario" onClick={onCancelar}>
            Cancelar
          </Botao>
        ) : null}
      </div>
    </form>
  );
}
