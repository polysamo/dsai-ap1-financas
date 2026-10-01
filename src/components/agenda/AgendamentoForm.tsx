import { useState, type FormEvent } from 'react';
import { REPETICOES_MAX, type DadosAgendamento } from '../../domain/agenda';
import { hojeISO } from '../../domain/date';
import { parseValor } from '../../domain/money';
import type { Categoria, Conta, Resultado, TipoMovimento } from '../../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from '../ui';

interface Props {
  categorias: Categoria[];
  contas: Conta[];
  onSalvar: (dados: DadosAgendamento) => Resultado<void>;
}

type Erros = Partial<Record<'descricao' | 'valor' | 'vencimento' | 'categoriaId' | 'contaId' | 'repeticoes' | 'geral', string>>;

export function AgendamentoForm({ categorias, contas, onSalvar }: Props) {
  const [tipo, setTipo] = useState<TipoMovimento>('despesa');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState(hojeISO());
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [repeticoes, setRepeticoes] = useState('1');
  const [erros, setErros] = useState<Erros>({});

  const opcoes = categorias.filter((c) => !c.arquivada && c.tipo === tipo);
  const contasAtivas = contas.filter((c) => !c.arquivada);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(valor);
    if (centavos === null) return setErros({ valor: 'Informe um valor válido, como 350,00.' });
    const r = onSalvar({
      descricao,
      tipo,
      valor: centavos,
      vencimento,
      categoriaId,
      contaId: contaId || undefined,
      repeticoes: Number(repeticoes),
    });
    if (!r.ok) return setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
    setErros({});
    setDescricao('');
    setValor('');
    setRepeticoes('1');
  };

  return (
    <form onSubmit={enviar} noValidate aria-label="Novo lançamento" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CampoSelect
        label="Tipo do lançamento"
        value={tipo}
        onChange={(e) => {
          setTipo(e.target.value as TipoMovimento);
          setCategoriaId('');
        }}
      >
        <option value="despesa">A pagar</option>
        <option value="receita">A receber</option>
      </CampoSelect>
      <CampoTexto label="Descrição do lançamento" value={descricao} onChange={(e) => setDescricao(e.target.value)} erro={erros.descricao} />
      <CampoTexto label="Valor do lançamento" value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valor} inputMode="decimal" placeholder="0,00" />
      <CampoTexto label="Vencimento" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} erro={erros.vencimento} />
      <CampoSelect label="Categoria do lançamento" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} erro={erros.categoriaId}>
        <option value="">Selecione</option>
        {opcoes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelect>
      <CampoSelect label="Conta (opcional)" value={contaId} onChange={(e) => setContaId(e.target.value)} erro={erros.contaId}>
        <option value="">Escolher ao pagar</option>
        {contasAtivas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelect>
      <CampoTexto
        label="Repetições mensais"
        type="number"
        min={1}
        max={REPETICOES_MAX}
        value={repeticoes}
        onChange={(e) => setRepeticoes(e.target.value)}
        erro={erros.repeticoes}
        dica="1 cria só este lançamento."
      />
      {erros.geral ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="sm:col-span-2 lg:col-span-4">
        <Botao type="submit">Adicionar lançamento</Botao>
      </div>
    </form>
  );
}
