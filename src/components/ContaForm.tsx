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
  const [fechamento, setFechamento] = useState(inicial?.cartao ? String(inicial.cartao.diaFechamento) : '');
  const [vencimento, setVencimento] = useState(inicial?.cartao ? String(inicial.cartao.diaVencimento) : '');
  const [limite, setLimite] = useState(inicial?.cartao ? valorParaCampo(inicial.cartao.limite) : '');
  const [erros, setErros] = useState<Record<'nome' | 'saldo' | 'geral' | 'diaFechamento' | 'diaVencimento' | 'limite', string | undefined>>({
    nome: undefined, saldo: undefined, geral: undefined, diaFechamento: undefined, diaVencimento: undefined, limite: undefined,
  });
  const semErros = { nome: undefined, saldo: undefined, geral: undefined, diaFechamento: undefined, diaVencimento: undefined, limite: undefined };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const saldoInicial = saldo.trim() === '' ? 0 : parseValor(saldo);
    if (saldoInicial === null) {
      setErros({ ...semErros, saldo: 'Informe um valor válido, como 1.234,56 ou -50,00.' });
      return;
    }
    // Ciclo do cartão é tudo ou nada: se qualquer campo foi preenchido, todos são validados.
    const preencheuCartao = tipo === 'cartao' && [fechamento, vencimento, limite].some((v) => v.trim() !== '');
    const limiteCentavos = parseValor(limite);
    const cartao = preencheuCartao
      ? { diaFechamento: Number(fechamento), diaVencimento: Number(vencimento), limite: limiteCentavos ?? Number.NaN }
      : undefined;
    const r = onSalvar({ nome, tipo, saldoInicial, cartao });
    if (!r.ok) {
      const campo = r.campo as keyof typeof semErros | undefined;
      setErros(campo && campo in semErros ? { ...semErros, [campo]: r.erro } : { ...semErros, geral: r.erro });
    }
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
      {tipo === 'cartao' ? (
        <fieldset className="grid gap-3 sm:col-span-3 sm:grid-cols-3">
          <legend className="mb-1 text-sm font-medium text-slate-700">Ciclo do cartão (opcional, preencha tudo ou nada)</legend>
          <CampoTexto label="Dia de fechamento" value={fechamento} onChange={(e) => setFechamento(e.target.value)} erro={erros.diaFechamento} inputMode="numeric" placeholder="1 a 28" />
          <CampoTexto label="Dia de vencimento" value={vencimento} onChange={(e) => setVencimento(e.target.value)} erro={erros.diaVencimento} inputMode="numeric" placeholder="1 a 28" />
          <CampoTexto label="Limite do cartão" value={limite} onChange={(e) => setLimite(e.target.value)} erro={erros.limite} inputMode="decimal" placeholder="0,00" />
        </fieldset>
      ) : null}
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
