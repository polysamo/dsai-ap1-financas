import { useState, type FormEvent } from 'react';
import { parsePercentual } from '../../domain/calculadoras';
import { parseValor } from '../../domain/money';
import type { Resultado } from '../../domain/types';

export type TipoCampo = 'dinheiro' | 'taxa' | 'inteiro';

const MENSAGEM: Record<TipoCampo, string> = {
  dinheiro: 'Informe um valor como 1.234,56.',
  taxa: 'Informe uma taxa como 1,25 (até 4 casas).',
  inteiro: 'Informe um número inteiro.',
};

/** Converte o texto de um campo; dinheiro vira centavos. */
export function lerNumero(texto: string, tipo: TipoCampo): number | null {
  if (tipo === 'dinheiro') return parseValor(texto);
  if (tipo === 'taxa') return parsePercentual(texto);
  return /^\s*-?\d+\s*$/.test(texto) ? Number(texto) : null;
}

export type Leitura<K extends string> = { ok: true; valores: Record<K, number> } | { ok: false; campo: K; erro: string };

/** Lê todos os campos de texto; para no primeiro que não for um número do tipo esperado. */
export function lerFormulario<K extends string>(textos: Record<K, string>, tipos: Record<K, TipoCampo>): Leitura<K> {
  const valores = {} as Record<K, number>;
  for (const campo of Object.keys(tipos) as K[]) {
    const n = lerNumero(textos[campo], tipos[campo]);
    if (n === null) return { ok: false, campo, erro: MENSAGEM[tipos[campo]] };
    valores[campo] = n;
  }
  return { ok: true, valores };
}

/**
 * Estado de uma calculadora: textos dos campos, erro por campo e o último resultado.
 * `calcular` recebe os números já lidos; erros do domínio voltam para o campo indicado.
 */
export function useCalculadora<K extends string, R>(inicial: Record<K, string>, tipos: Record<K, TipoCampo>, calcular: (valores: Record<K, number>) => Resultado<R>) {
  const [textos, setTextos] = useState(inicial);
  const [erro, setErro] = useState<{ campo?: string; texto: string } | null>(null);
  const [resultado, setResultado] = useState<R | null>(null);

  const alterar = (campo: K) => (valor: string) => setTextos((t) => ({ ...t, [campo]: valor }));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const leitura = lerFormulario(textos, tipos);
    if (!leitura.ok) {
      setErro({ campo: leitura.campo, texto: leitura.erro });
      setResultado(null);
      return;
    }
    const r = calcular(leitura.valores);
    if (!r.ok) {
      setErro({ campo: r.campo, texto: r.erro });
      setResultado(null);
      return;
    }
    setErro(null);
    setResultado(r.valor);
  };

  /** Erro a mostrar junto ao campo, se for dele. */
  const erroDe = (campo: K) => (erro?.campo === campo ? erro.texto : undefined);
  /** Erro sem campo identificado (mostrado acima do resultado). */
  const erroGeral = erro && !erro.campo ? erro.texto : null;

  return { textos, alterar, enviar, erroDe, erroGeral, resultado };
}
