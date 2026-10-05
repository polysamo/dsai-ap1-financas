import { useState, type FormEvent } from 'react';
import { OpcoesCategorias } from './OpcoesCategorias';
import { Link } from 'react-router-dom';
import { hojeISO } from '../domain/date';
import { parseValor, valorParaCampo } from '../domain/money';
import { formatarTags, parseTags, TAG_TAMANHO_MAX, TAGS_MAX } from '../domain/tags';
import type { DadosTransacao } from '../domain/transacoes';
import type { AppState, Resultado, TipoMovimento, Transacao } from '../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from './ui';
import './TransacaoForm.css';

interface Props {
  estado: AppState;
  inicial?: Transacao;
  onSalvar: (dados: DadosTransacao) => Resultado<void>;
  onCancelar: () => void;
}

type Erros = Partial<Record<'contaId' | 'categoriaId' | 'valor' | 'data' | 'descricao' | 'tags' | 'geral', string>>;

export function TransacaoForm({ estado, inicial, onSalvar, onCancelar }: Props) {
  const contasDisponiveis = estado.contas.filter((c) => !c.arquivada || c.id === inicial?.contaId);
  const [tipo, setTipo] = useState<TipoMovimento>(inicial?.tipo ?? 'despesa');
  const [contaId, setContaId] = useState(inicial?.contaId ?? contasDisponiveis[0]?.id ?? '');
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '');
  const [valor, setValor] = useState(inicial ? valorParaCampo(inicial.valor) : '');
  const [data, setData] = useState(inicial?.data ?? hojeISO());
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [tags, setTags] = useState(formatarTags(inicial?.tags));
  const [erros, setErros] = useState<Erros>({});

  if (contasDisponiveis.length === 0) {
    return (
      <Alerta tipo="aviso">
        Você precisa de ao menos uma conta ativa para registrar transações.{' '}
        <Link to="/contas" className="transacao-form__link">
          Criar uma conta
        </Link>
      </Alerta>
    );
  }


  const trocarTipo = (novo: TipoMovimento) => {
    setTipo(novo);
    setCategoriaId('');
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(valor);
    if (centavos === null) {
      setErros({ valor: 'Informe um valor válido, como 49,90.' });
      return;
    }
    const r = onSalvar({ contaId, categoriaId, tipo, valor: centavos, data, descricao, tags: parseTags(tags) });
    if (!r.ok) setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
  };

  return (
    <form onSubmit={enviar} noValidate aria-label={inicial ? 'Editar transação' : 'Nova transação'} className="transacao-form">
      <CampoSelect label="Tipo" value={tipo} onChange={(e) => trocarTipo(e.target.value as TipoMovimento)}>
        <option value="despesa">Despesa</option>
        <option value="receita">Receita</option>
      </CampoSelect>
      <CampoSelect label="Conta" value={contaId} onChange={(e) => setContaId(e.target.value)} erro={erros.contaId}>
        {contasDisponiveis.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelect>
      <CampoSelect label="Categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} erro={erros.categoriaId}>
        <option value="">Selecione…</option>
        <OpcoesCategorias categorias={estado.categorias} tipo={tipo} manterId={inicial?.categoriaId} />
      </CampoSelect>
      <CampoTexto label="Valor" value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valor} inputMode="decimal" placeholder="0,00" />
      <CampoTexto label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
      <CampoTexto label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} erro={erros.descricao} maxLength={140} autoComplete="off" />
      <CampoTexto
        label="Tags"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        erro={erros.tags}
        dica={`Opcional, separadas por vírgula (até ${TAGS_MAX}, ${TAG_TAMANHO_MAX} caracteres cada).`}
        autoComplete="off"
      />
      {erros.geral ? (
        <div className="transacao-form__largo">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="transacao-form__acoes">
        <Botao type="submit">{inicial ? 'Salvar alterações' : 'Adicionar transação'}</Botao>
        <Botao variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
