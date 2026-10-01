import { useState, type FormEvent } from 'react';
import { Botao, CampoSelect, CampoTexto } from '../ui';
import {
  ROTULO_TIPO_DIVISAO,
  TOTAL_PERCENTUAL,
  type DadosDespesa,
  type DespesaDivisao,
  type GrupoDivisao,
  type ParteDespesa,
  type TipoDivisao,
} from '../../domain/divisao';
import { formatarMoeda, parseValor, valorParaCampo } from '../../domain/money';
import type { Resultado } from '../../domain/types';
import './DespesaForm.css';

interface Props {
  grupo: GrupoDivisao;
  hoje: string;
  inicial?: DespesaDivisao;
  onSalvar: (dados: DadosDespesa) => Resultado<unknown>;
  onCancelar?: () => void;
}

type TipoComTexto = Exclude<TipoDivisao, 'igual'>;

const TIPOS = Object.keys(ROTULO_TIPO_DIVISAO) as TipoDivisao[];
const ROTULO_CAMPO: Record<TipoComTexto, string> = { percentual: 'Percentual (%)', exata: 'Valor (R$)', cotas: 'Cotas' };

/** Texto vazio vale 0 (fora da divisão); null indica texto inválido. */
function pesoDoTexto(tipo: TipoComTexto, texto: string): number | null {
  const t = texto.trim();
  if (t === '') return 0;
  if (tipo === 'cotas') return /^\d{1,6}$/.test(t) ? Number(t) : null;
  const v = parseValor(t);
  return v === null || v < 0 ? null : v;
}

function entradasIniciais(d?: DespesaDivisao): Record<string, string> {
  if (!d || d.tipo === 'igual') return {};
  return Object.fromEntries(d.partes.map((p) => [p.participanteId, d.tipo === 'cotas' ? String(p.peso) : valorParaCampo(p.peso)]));
}

export function DespesaForm({ grupo, hoje, inicial, onSalvar, onCancelar }: Props) {
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [valorTexto, setValorTexto] = useState(inicial ? valorParaCampo(inicial.valor) : '');
  const [data, setData] = useState(inicial?.data ?? hoje);
  const [pagadorId, setPagadorId] = useState(inicial?.pagadorId ?? grupo.participantes[0].id);
  const [tipo, setTipo] = useState<TipoDivisao>(inicial?.tipo ?? 'igual');
  const [incluidos, setIncluidos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(grupo.participantes.map((p) => [p.id, inicial?.tipo === 'igual' ? inicial.partes.some((x) => x.participanteId === p.id) : true])),
  );
  const [entradas, setEntradas] = useState<Record<string, string>>(() => entradasIniciais(inicial));
  const [erros, setErros] = useState<Record<string, string>>({});

  const trocarTipo = (novo: TipoDivisao) => {
    setTipo(novo);
    setEntradas({});
    setErros({});
  };

  const montarPartes = (): { partes: ParteDespesa[] } | { erro: string } => {
    if (tipo === 'igual') {
      return { partes: grupo.participantes.filter((p) => incluidos[p.id]).map((p) => ({ participanteId: p.id, peso: 1 })) };
    }
    const partes: ParteDespesa[] = [];
    for (const p of grupo.participantes) {
      const peso = pesoDoTexto(tipo, entradas[p.id] ?? '');
      if (peso === null) return { erro: `Valor inválido para ${p.nome}.` };
      if (peso > 0) partes.push({ participanteId: p.id, peso });
    }
    return { partes };
  };

  const somaInformada = (): string | null => {
    if (tipo === 'igual') return null;
    const pesos = grupo.participantes.map((p) => pesoDoTexto(tipo, entradas[p.id] ?? ''));
    if (pesos.some((p) => p === null)) return null;
    const total = (pesos as number[]).reduce((a, b) => a + b, 0);
    if (tipo === 'percentual') return `Soma dos percentuais: ${valorParaCampo(total)}% de ${valorParaCampo(TOTAL_PERCENTUAL)}%`;
    if (tipo === 'cotas') return `Total de cotas: ${total}`;
    const valor = parseValor(valorTexto);
    return `Soma dos valores: ${formatarMoeda(total)}${valor ? ` de ${formatarMoeda(valor)}` : ''}`;
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const valor = parseValor(valorTexto);
    if (valor === null) return setErros({ valor: 'Informe um valor válido, como 25,90.' });
    const montadas = montarPartes();
    if ('erro' in montadas) return setErros({ partes: montadas.erro });
    const r = onSalvar({ id: inicial?.id, descricao, valor, data, pagadorId, tipo, partes: montadas.partes });
    if (!r.ok) return setErros({ [r.campo ?? 'geral']: r.erro });
    if (!inicial) {
      setDescricao('');
      setValorTexto('');
      setEntradas({});
      setErros({});
    }
  };

  const soma = somaInformada();

  return (
    <form className="divisao-despesa-form" onSubmit={enviar} noValidate aria-label={inicial ? 'Editar despesa' : 'Nova despesa'}>
      <div className="divisao-despesa-form__grade">
        <CampoTexto label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} erro={erros.descricao} />
        <CampoTexto label="Valor (R$)" inputMode="decimal" value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} erro={erros.valor} />
        <CampoTexto label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
        <CampoSelect label="Quem pagou" value={pagadorId} onChange={(e) => setPagadorId(e.target.value)} erro={erros.pagadorId}>
          {grupo.participantes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect label="Tipo de divisão" value={tipo} onChange={(e) => trocarTipo(e.target.value as TipoDivisao)}>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {ROTULO_TIPO_DIVISAO[t]}
            </option>
          ))}
        </CampoSelect>
      </div>

      <fieldset className="divisao-despesa-form__divisao">
        <legend>Dividir entre</legend>
        {tipo === 'igual'
          ? grupo.participantes.map((p) => (
              <label key={p.id} className="divisao-despesa-form__check">
                <input type="checkbox" checked={!!incluidos[p.id]} onChange={(e) => setIncluidos((s) => ({ ...s, [p.id]: e.target.checked }))} />
                {p.nome}
              </label>
            ))
          : grupo.participantes.map((p) => (
              <CampoTexto
                key={p.id}
                label={`${ROTULO_CAMPO[tipo]} de ${p.nome}`}
                inputMode={tipo === 'cotas' ? 'numeric' : 'decimal'}
                value={entradas[p.id] ?? ''}
                onChange={(e) => setEntradas((s) => ({ ...s, [p.id]: e.target.value }))}
              />
            ))}
        {soma ? (
          <p className="divisao-despesa-form__soma" aria-live="polite">
            {soma}
          </p>
        ) : null}
        {erros.partes ? (
          <p role="alert" className="divisao-despesa-form__erro">
            {erros.partes}
          </p>
        ) : null}
      </fieldset>
      {erros.geral ? (
        <p role="alert" className="divisao-despesa-form__erro">
          {erros.geral}
        </p>
      ) : null}
      <div className="divisao-despesa-form__acoes">
        <Botao type="submit">{inicial ? 'Salvar despesa' : 'Adicionar despesa'}</Botao>
        {onCancelar ? (
          <Botao variante="secundario" onClick={onCancelar}>
            Cancelar edição
          </Botao>
        ) : null}
      </div>
    </form>
  );
}
