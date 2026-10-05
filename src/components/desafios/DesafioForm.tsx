import { useState, type FormEvent } from 'react';
import { hojeISO } from '../../domain/date';
import { FATOR_52_SEMANAS, ROTULO_TIPO_DESAFIO, type DadosDesafio, type TipoDesafio } from '../../domain/desafios';
import { formatarMoeda, parseValor } from '../../domain/money';
import { arvoreCategorias } from '../../domain/subcategorias';
import type { Categoria, Resultado } from '../../domain/types';
import { DateField } from '../novos';
import { OpcoesCategorias } from '../OpcoesCategorias';
import { Botao, CampoSelect, CampoTexto } from '../ui';

interface Props {
  categorias: Categoria[];
  onSalvar: (dados: DadosDesafio) => Resultado<void>;
}

export function DesafioForm({ categorias, onSalvar }: Props) {
  const [tipo, setTipo] = useState<TipoDesafio>('sem-gastos');
  const [nome, setNome] = useState('');
  const [inicio, setInicio] = useState(hojeISO());
  const [valorBase, setValorBase] = useState('5,00');
  const [ordem, setOrdem] = useState<'crescente' | 'decrescente'>('crescente');
  const [dias, setDias] = useState('30');
  const [categoriaIds, setCategoriaIds] = useState<string[]>([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [limite, setLimite] = useState('');
  const [erro, setErro] = useState<{ campo?: string; texto: string } | null>(null);

  const dinheiro = (texto: string, campo: string): number | null => {
    const v = parseValor(texto);
    if (v === null) setErro({ campo, texto: 'Informe um valor como 50,00.' });
    return v;
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(dias);
    let dados: DadosDesafio;
    if (tipo === 'semanas52') {
      const base = dinheiro(valorBase, 'valorBase');
      if (base === null) return;
      dados = { tipo, nome, inicio, valorBase: base, ordem };
    } else if (tipo === 'sem-gastos') {
      dados = { tipo, nome, inicio, dias: n, categoriaIds };
    } else {
      const teto = dinheiro(limite, 'limite');
      if (teto === null) return;
      dados = { tipo, nome, inicio, dias: n, categoriaId, limite: teto };
    }
    const r = onSalvar(dados);
    if (!r.ok) return setErro({ campo: r.campo, texto: r.erro });
    setErro(null);
    setNome('');
  };

  const erroDe = (campo: string) => (erro?.campo === campo ? erro.texto : undefined);
  const base = parseValor(valorBase);
  const despesas = arvoreCategorias(categorias, 'despesa', (c) => !c.arquivada);

  return (
    <form onSubmit={enviar} noValidate aria-label="Novo desafio" className="desafios-form">
      <CampoSelect label="Tipo de desafio" value={tipo} onChange={(e) => setTipo(e.target.value as TipoDesafio)}>
        {(Object.keys(ROTULO_TIPO_DESAFIO) as TipoDesafio[]).map((t) => (
          <option key={t} value={t}>
            {ROTULO_TIPO_DESAFIO[t]}
          </option>
        ))}
      </CampoSelect>
      <CampoTexto label="Nome do desafio" value={nome} onChange={(e) => setNome(e.target.value)} erro={erroDe('nome')} maxLength={80} />
      <DateField label="Começa em" value={inicio} onChange={setInicio} erro={erroDe('inicio')} />

      {tipo === 'semanas52' ? (
        <>
          <CampoTexto
            label="Valor base"
            inputMode="decimal"
            value={valorBase}
            onChange={(e) => setValorBase(e.target.value)}
            erro={erroDe('valorBase')}
            dica={base && base > 0 ? `Total ao fim: ${formatarMoeda(base * FATOR_52_SEMANAS)}` : undefined}
          />
          <CampoSelect label="Ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as 'crescente' | 'decrescente')}>
            <option value="crescente">Crescente (começa com pouco)</option>
            <option value="decrescente">Decrescente (começa com mais)</option>
          </CampoSelect>
        </>
      ) : (
        <CampoTexto label="Duração (dias)" inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} erro={erroDe('dias')} />
      )}

      {tipo === 'sem-gastos' ? (
        <fieldset className="desafios-form__categorias">
          <legend className="ui-campo__rotulo">Sem gastar com</legend>
          {despesas.map(({ categoria: c, nivel }) => (
            <label key={c.id} className={nivel === 1 ? 'desafios-form__sub' : undefined}>
              <input
                type="checkbox"
                checked={categoriaIds.includes(c.id)}
                onChange={(e) => setCategoriaIds((atual) => (e.target.checked ? [...atual, c.id] : atual.filter((x) => x !== c.id)))}
              />
              {c.nome}
            </label>
          ))}
          {erroDe('categoriaIds') ? (
            <p role="alert" className="ui-campo__erro">
              {erroDe('categoriaIds')}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {tipo === 'teto' ? (
        <>
          <CampoSelect label="Categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} erro={erroDe('categoriaId')}>
            <option value="">Selecione…</option>
            <OpcoesCategorias categorias={categorias} tipo="despesa" />
          </CampoSelect>
          <CampoTexto label="Gastar no máximo" inputMode="decimal" value={limite} onChange={(e) => setLimite(e.target.value)} erro={erroDe('limite')} placeholder="0,00" />
        </>
      ) : null}

      <div className="desafios-form__acoes">
        <Botao type="submit">Começar desafio</Botao>
      </div>
    </form>
  );
}
