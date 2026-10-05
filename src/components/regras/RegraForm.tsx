import { useState, type FormEvent } from 'react';
import { OpcoesCategorias } from '../OpcoesCategorias';
import { MODOS_PADRAO, PADRAO_MAX, type DadosRegra } from '../../domain/regras';
import { formatarTags, parseTags, TAG_TAMANHO_MAX, TAGS_MAX } from '../../domain/tags';
import type { AppState, ModoPadrao, RegraCategoria, Resultado, TipoMovimento } from '../../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from '../ui';
import './regras.css';

interface Props {
  estado: AppState;
  inicial?: RegraCategoria;
  onSalvar: (dados: DadosRegra) => Resultado<void>;
  onCancelar: () => void;
}

type Erros = Partial<Record<'padrao' | 'categoriaId' | 'tags' | 'geral', string>>;

export function RegraForm({ estado, inicial, onSalvar, onCancelar }: Props) {
  const [padrao, setPadrao] = useState(inicial?.padrao ?? '');
  const [modo, setModo] = useState<ModoPadrao>(inicial?.modo ?? 'contem');
  const [tipo, setTipo] = useState<TipoMovimento>(inicial?.tipo ?? 'despesa');
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '');
  const [tags, setTags] = useState(formatarTags(inicial?.tags));
  const [erros, setErros] = useState<Erros>({});


  const trocarTipo = (novo: TipoMovimento) => {
    setTipo(novo);
    setCategoriaId('');
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = onSalvar({ padrao, modo, tipo, categoriaId, tags: parseTags(tags) });
    if (!r.ok) setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
  };

  return (
    <form onSubmit={enviar} noValidate aria-label={inicial ? 'Editar regra' : 'Nova regra'} className="regras-form">
      <CampoSelect label="Condição" value={modo} onChange={(e) => setModo(e.target.value as ModoPadrao)}>
        {MODOS_PADRAO.map((m) => (
          <option key={m.valor} value={m.valor}>
            {m.rotulo}
          </option>
        ))}
      </CampoSelect>
      <CampoTexto label="Texto da descrição" value={padrao} onChange={(e) => setPadrao(e.target.value)} erro={erros.padrao} maxLength={PADRAO_MAX} autoComplete="off" dica="Sem diferenciar maiúsculas nem acentos." />
      <CampoSelect label="Tipo" value={tipo} onChange={(e) => trocarTipo(e.target.value as TipoMovimento)}>
        <option value="despesa">Despesa</option>
        <option value="receita">Receita</option>
      </CampoSelect>
      <CampoSelect label="Categoria de destino" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} erro={erros.categoriaId}>
        <option value="">Selecione…</option>
        <OpcoesCategorias categorias={estado.categorias} tipo={tipo} manterId={inicial?.categoriaId} />
      </CampoSelect>
      <CampoTexto
        label="Tags da regra"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        erro={erros.tags}
        dica={`Opcional, separadas por vírgula (até ${TAGS_MAX}, ${TAG_TAMANHO_MAX} caracteres cada).`}
        autoComplete="off"
      />
      {erros.geral ? (
        <div className="regras-form-linha">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="regras-form-linha regras-form-botoes">
        <Botao type="submit">{inicial ? 'Salvar regra' : 'Adicionar regra'}</Botao>
        <Botao variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
