import { useState, type FormEvent } from 'react';
import { ROTULO_TIPO_CONTA, TIPOS_CONTA, type DadosConta } from '../domain/contas';
import { parseValor, valorParaCampo } from '../domain/money';
import type { Conta, Resultado, TipoConta } from '../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from './ui';

interface Props {
  inicial?: Conta;
  onSalvar: (dados: DadosConta) => Resultado<void>;
  onCancelar: () => void;
}

export function ContaForm({ inicial, onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [tipo, setTipo] = useState<TipoConta>(inicial?.tipo ?? 'corrente');
  const [saldo, setSaldo] = useState(inicial ? valorParaCampo(inicial.saldoInicial) : '');
  const [erros, setErros] = useState<{ nome?: string; saldo?: string; geral?: string }>({});

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const saldoInicial = saldo.trim() === '' ? 0 : parseValor(saldo);
    if (saldoInicial === null) {
      setErros({ saldo: 'Informe um valor válido, como 1.234,56 ou -50,00.' });
      return;
    }
    const r = onSalvar({ nome, tipo, saldoInicial });
    if (!r.ok) setErros(r.campo === 'nome' ? { nome: r.erro } : { geral: r.erro });
  };

  return (
    <form onSubmit={enviar} noValidate className="grid gap-3 sm:grid-cols-3" aria-label={inicial ? 'Editar conta' : 'Nova conta'}>
      <CampoTexto label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} maxLength={80} autoComplete="off" />
      <CampoSelect label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoConta)}>
        {TIPOS_CONTA.map((t) => (
          <option key={t} value={t}>
            {ROTULO_TIPO_CONTA[t]}
          </option>
        ))}
      </CampoSelect>
      <CampoTexto
        label="Saldo inicial"
        value={saldo}
        onChange={(e) => setSaldo(e.target.value)}
        erro={erros.saldo}
        inputMode="decimal"
        placeholder="0,00"
        dica="Aceita valores negativos, como -50,00."
      />
      {erros.geral ? (
        <div className="sm:col-span-3">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="flex gap-2 sm:col-span-3">
        <Botao type="submit">{inicial ? 'Salvar alterações' : 'Criar conta'}</Botao>
        <Botao variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
