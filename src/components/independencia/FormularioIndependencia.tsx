import { CampoTexto, Cartao } from '../ui';
import { formatarMoeda } from '../../domain/money';
import type { CampoIndependencia, ErrosFormulario, FormularioIndependencia, Sugestoes } from '../../domain/independencia';
import './FormularioIndependencia.css';

type CampoSugerido = 'patrimonio' | 'aporteMensal' | 'gastoMensal';

interface Props {
  valores: FormularioIndependencia;
  /** Erros de validação; só os campos já tocados exibem a mensagem. */
  erros: ErrosFormulario;
  tocados: ReadonlySet<CampoIndependencia>;
  sugestoes: Sugestoes;
  onAlterar: (campo: CampoIndependencia, valor: string) => void;
  onTocar: (campo: CampoIndependencia) => void;
  onUsarSugestao: (campo: CampoSugerido) => void;
}

const ORIGEM: Record<CampoSugerido, string> = {
  patrimonio: 'valor atual da carteira de investimentos',
  aporteMensal: 'média de receitas menos despesas dos últimos meses',
  gastoMensal: 'média de despesas dos últimos meses',
};

export function PremissasIndependencia({ valores, erros, tocados, sugestoes, onAlterar, onTocar, onUsarSugestao }: Props) {
  const propsDe = (c: CampoIndependencia) => ({
    value: valores[c],
    erro: tocados.has(c) ? erros[c] : undefined,
    onChange: (e: { target: { value: string } }) => onAlterar(c, e.target.value),
    onBlur: () => onTocar(c),
  });
  const sugestao = (campo: CampoSugerido) => {
    const valor = sugestoes[campo];
    return (
      <p className="indep-form__sugestao">
        {valor === null ? (
          `Sem dados para sugerir (${ORIGEM[campo]}).`
        ) : (
          <>
            Sugestão ({ORIGEM[campo]}):{' '}
            <button type="button" onClick={() => onUsarSugestao(campo)}>
              usar {formatarMoeda(valor)}
            </button>
          </>
        )}
      </p>
    );
  };

  return (
    <Cartao titulo="Premissas">
      <div className="indep-form__grade">
        <div className="indep-form__campo">
          <CampoTexto label="Patrimônio investido atual (R$)" inputMode="decimal" autoComplete="off" {...propsDe('patrimonio')} />
          {sugestao('patrimonio')}
        </div>
        <div className="indep-form__campo">
          <CampoTexto label="Aporte mensal (R$)" inputMode="decimal" autoComplete="off" {...propsDe('aporteMensal')} />
          {sugestao('aporteMensal')}
        </div>
        <div className="indep-form__campo">
          <CampoTexto label="Gasto mensal desejado na independência (R$)" inputMode="decimal" autoComplete="off" {...propsDe('gastoMensal')} />
          {sugestao('gastoMensal')}
        </div>
        <CampoTexto label="Retorno real anual (%)" inputMode="decimal" autoComplete="off" dica="Já descontada a inflação." {...propsDe('retornoAnual')} />
        <CampoTexto
          label="Taxa de retirada anual (%)"
          inputMode="decimal"
          autoComplete="off"
          dica="A regra dos 4% é uma referência comum."
          {...propsDe('taxaRetirada')}
        />
        <CampoTexto label="Idade atual (opcional)" inputMode="numeric" autoComplete="off" {...propsDe('idadeAtual')} />
        <CampoTexto label="Idade alvo (opcional)" inputMode="numeric" autoComplete="off" {...propsDe('idadeAlvo')} />
      </div>
    </Cartao>
  );
}
