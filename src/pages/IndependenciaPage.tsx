import { useMemo, useState } from 'react';
import { CenariosDeRetorno, SensibilidadeAporte } from '../components/independencia/CenariosDeRetorno';
import { CenariosSalvos } from '../components/independencia/CenariosSalvos';
import { EvolucaoIndependencia } from '../components/independencia/EvolucaoIndependencia';
import { PremissasIndependencia } from '../components/independencia/FormularioIndependencia';
import { ResultadoIndependencia } from '../components/independencia/ResultadoIndependencia';
import { Alerta, EstadoVazio, TituloPagina } from '../components/ui';
import { hojeISO } from '../domain/date';
import {
  bpParaCampo,
  cenariosDeRetorno,
  excluirCenario,
  lerFormulario,
  listaCenarios,
  salvarCenario,
  sensibilidadeAporte,
  simular,
  situacaoIdade,
  sugerirPremissas,
  type CampoIndependencia,
  type CenarioIndependencia,
  type FormularioIndependencia,
} from '../domain/independencia';
import { valorParaCampo } from '../domain/money';
import { useEstado, useStore } from '../state/store';
import './IndependenciaPage.css';

const textoCampo = (valor: number | null) => (valor === null ? '' : valorParaCampo(valor));

export function IndependenciaPage() {
  const store = useStore();
  const estado = useEstado();
  const hoje = hojeISO();
  const sugestoes = useMemo(() => sugerirPremissas(estado, hoje), [estado, hoje]);

  const [form, setForm] = useState<FormularioIndependencia>(() => ({
    patrimonio: textoCampo(sugestoes.patrimonio ?? 0),
    aporteMensal: textoCampo(sugestoes.aporteMensal),
    retornoAnual: '4',
    gastoMensal: textoCampo(sugestoes.gastoMensal),
    taxaRetirada: '4',
    idadeAtual: '',
    idadeAlvo: '',
  }));
  const [tocados, setTocados] = useState<ReadonlySet<CampoIndependencia>>(new Set());
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);

  const leitura = useMemo(() => lerFormulario(form), [form]);
  const parametros = leitura.ok ? leitura.valor : null;
  const analise = useMemo(() => {
    if (!parametros) return null;
    const simulacao = simular(parametros, undefined, hoje);
    return {
      simulacao,
      idade: situacaoIdade(parametros, simulacao),
      cenarios: cenariosDeRetorno(parametros, hoje),
      sensibilidade: sensibilidadeAporte(parametros, hoje),
    };
  }, [parametros, hoje]);

  const tocar = (campo: CampoIndependencia) => setTocados((t) => new Set(t).add(campo));
  const alterar = (campo: CampoIndependencia, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    tocar(campo);
  };

  const carregar = (c: CenarioIndependencia) => {
    const p = c.parametros;
    setForm({
      patrimonio: valorParaCampo(p.patrimonio),
      aporteMensal: valorParaCampo(p.aporteMensal),
      retornoAnual: bpParaCampo(p.retornoAnualBp),
      gastoMensal: valorParaCampo(p.gastoMensal),
      taxaRetirada: bpParaCampo(p.taxaRetiradaBp),
      idadeAtual: p.idadeAtual === undefined ? '' : String(p.idadeAtual),
      idadeAlvo: p.idadeAlvo === undefined ? '' : String(p.idadeAlvo),
    });
    setTocados(new Set());
    setErroGlobal(null);
  };

  const salvar = (nome: string): string | null => {
    if (!parametros) return 'Corrija as premissas antes de salvar o cenário.';
    const r = store.aplicar((e) => salvarCenario(e, nome, parametros));
    return r.ok ? null : r.erro;
  };

  const excluir = (c: CenarioIndependencia) => {
    const r = store.aplicar((e) => excluirCenario(e, c.id));
    setErroGlobal(r.ok ? null : r.erro);
  };

  return (
    <div className="indep-pagina">
      <TituloPagina>Independência financeira</TituloPagina>
      <p className="indep-pagina__intro">
        Estime quanto patrimônio você precisa para viver de renda e em quanto tempo chega lá. Os valores sugeridos vêm dos seus dados e podem ser editados.
      </p>
      {erroGlobal ? <Alerta>{erroGlobal}</Alerta> : null}

      <PremissasIndependencia
        valores={form}
        erros={leitura.ok ? {} : leitura.erros}
        tocados={tocados}
        sugestoes={sugestoes}
        onAlterar={alterar}
        onTocar={tocar}
        onUsarSugestao={(campo) => alterar(campo, textoCampo(sugestoes[campo]))}
      />

      {parametros && analise ? (
        <>
          <ResultadoIndependencia parametros={parametros} simulacao={analise.simulacao} idade={analise.idade} />
          <EvolucaoIndependencia parametros={parametros} simulacao={analise.simulacao} />
          <div className="indep-pagina__duas-colunas">
            <CenariosDeRetorno cenarios={analise.cenarios} />
            <SensibilidadeAporte linhas={analise.sensibilidade} aporteAtual={parametros.aporteMensal} />
          </div>
        </>
      ) : (
        <EstadoVazio titulo="Preencha as premissas para ver o resultado">
          Corrija os campos destacados acima; o patrimônio-alvo, o prazo e os cenários aparecem assim que estiverem válidos.
        </EstadoVazio>
      )}

      <CenariosSalvos
        cenarios={listaCenarios(estado)}
        hoje={hoje}
        podeSalvar={parametros !== null}
        onSalvar={salvar}
        onCarregar={carregar}
        onExcluir={excluir}
      />
    </div>
  );
}
