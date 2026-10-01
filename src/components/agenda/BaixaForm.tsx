import { useState, type FormEvent } from 'react';
import type { DadosBaixa } from '../../domain/agenda';
import { hojeISO } from '../../domain/date';
import type { Agendamento, Categoria, Conta, Resultado } from '../../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from '../ui';
import './agenda.css';

interface Props {
  item: Agendamento;
  categorias: Categoria[];
  contas: Conta[];
  onConfirmar: (dados: DadosBaixa) => Resultado<void>;
  onCancelar: () => void;
}

type Erros = Partial<Record<'contaId' | 'categoriaId' | 'data' | 'geral', string>>;

export function BaixaForm({ item, categorias, contas, onConfirmar, onCancelar }: Props) {
  const contasAtivas = contas.filter((c) => !c.arquivada);
  const opcoes = categorias.filter((c) => !c.arquivada && c.tipo === item.tipo);
  const [contaId, setContaId] = useState(item.contaId && contasAtivas.some((c) => c.id === item.contaId) ? item.contaId : (contasAtivas[0]?.id ?? ''));
  const [categoriaId, setCategoriaId] = useState(opcoes.some((c) => c.id === item.categoriaId) ? item.categoriaId : '');
  const [data, setData] = useState(hojeISO());
  const [erros, setErros] = useState<Erros>({});

  if (contasAtivas.length === 0) {
    return (
      <div className="agenda-alertas">
        <Alerta tipo="aviso">Para dar baixa é preciso ter uma conta ativa.</Alerta>
        <Botao variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
      </div>
    );
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = onConfirmar({ contaId, categoriaId, data });
    if (!r.ok) setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
  };

  return (
    <form onSubmit={enviar} noValidate aria-label={`Marcar como pago: ${item.descricao}`} className="agenda-form agenda-form-3">
      <CampoSelect label="Conta do pagamento" value={contaId} onChange={(e) => setContaId(e.target.value)} erro={erros.contaId}>
        {contasAtivas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelect>
      <CampoSelect label="Categoria do pagamento" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} erro={erros.categoriaId}>
        <option value="">Selecione</option>
        {opcoes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelect>
      <CampoTexto label="Data do pagamento" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
      {erros.geral ? (
        <div className="agenda-form-linha">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="agenda-form-linha agenda-form-botoes">
        <Botao type="submit">Confirmar pagamento</Botao>
        <Botao variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
