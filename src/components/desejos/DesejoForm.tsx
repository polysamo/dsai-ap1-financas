import { useState, type FormEvent } from 'react';
import { ESPERA_PADRAO, PERIODOS_ESPERA, ROTULO_PRIORIDADE, type DadosDesejo, type Desejo, type Prioridade } from '../../domain/desejos';
import { parseValor, valorParaCampo } from '../../domain/money';
import type { Categoria, Resultado } from '../../domain/types';
import { OpcoesCategorias } from '../OpcoesCategorias';
import { Botao, CampoSelect, CampoTexto } from '../ui';

interface Props {
  categorias: Categoria[];
  inicial?: Desejo;
  onSalvar: (dados: DadosDesejo) => Resultado<void>;
  onCancelar?: () => void;
}

export function DesejoForm({ categorias, inicial, onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [preco, setPreco] = useState(inicial ? valorParaCampo(inicial.preco) : '');
  const [prioridade, setPrioridade] = useState<Prioridade>(inicial?.prioridade ?? 'media');
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '');
  const [espera, setEspera] = useState(String(ESPERA_PADRAO));
  const [erro, setErro] = useState<{ campo?: string; texto: string } | null>(null);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(preco);
    if (centavos === null) return setErro({ campo: 'preco', texto: 'Informe um preço como 1.299,90.' });
    const dados: DadosDesejo = { nome, preco: centavos, prioridade, categoriaId, ...(inicial ? {} : { esperaDias: Number(espera) }) };
    const r = onSalvar(dados);
    if (!r.ok) return setErro({ campo: r.campo, texto: r.erro });
    setErro(null);
    if (!inicial) {
      setNome('');
      setPreco('');
    }
  };

  const erroDe = (campo: string) => (erro?.campo === campo ? erro.texto : undefined);

  return (
    <form onSubmit={enviar} noValidate aria-label={inicial ? `Editar ${inicial.nome}` : 'Novo desejo'} className="desejos-form">
      <CampoTexto label="O que você quer comprar" value={nome} onChange={(e) => setNome(e.target.value)} erro={erroDe('nome')} maxLength={80} />
      <CampoTexto label="Preço" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} erro={erroDe('preco')} placeholder="0,00" />
      <CampoSelect label="Prioridade" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)}>
        {(Object.keys(ROTULO_PRIORIDADE) as Prioridade[]).map((p) => (
          <option key={p} value={p}>
            {ROTULO_PRIORIDADE[p]}
          </option>
        ))}
      </CampoSelect>
      <CampoSelect label="Categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} erro={erroDe('categoriaId')}>
        <option value="">Selecione…</option>
        <OpcoesCategorias categorias={categorias} tipo="despesa" manterId={inicial?.categoriaId} />
      </CampoSelect>
      {inicial ? null : (
        <CampoSelect label="Esperar antes de comprar" value={espera} onChange={(e) => setEspera(e.target.value)}>
          {PERIODOS_ESPERA.map((d) => (
            <option key={d} value={d}>
              {d === 0 ? 'Não esperar' : `${d} dias`}
            </option>
          ))}
        </CampoSelect>
      )}
      <div className="desejos-form__acoes">
        <Botao type="submit">{inicial ? 'Salvar' : 'Adicionar desejo'}</Botao>
        {onCancelar ? (
          <Botao variante="secundario" onClick={onCancelar}>
            Cancelar
          </Botao>
        ) : null}
      </div>
    </form>
  );
}
