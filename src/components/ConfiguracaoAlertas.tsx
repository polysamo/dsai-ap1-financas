import { useState, type FormEvent } from 'react';
import {
  DIAS_ANTECEDENCIA_MAX,
  DIAS_ANTECEDENCIA_MIN,
  ROTULO_TIPO_ALERTA,
  TIPOS_ALERTA,
  preferenciasDe,
  validarLimiares,
  definirLimiares,
  type TipoAlerta,
} from '../domain/alertas';
import { parseValor, valorParaCampo } from '../domain/money';
import { useEstado, useStore } from '../state/store';
import { Alerta, Botao, Cartao, CampoTexto } from './ui';
import './ConfiguracaoAlertas.css';

/** Formulário dos limiares de alerta: antecedência, saldo mínimo e tipos ligados. */
export function ConfiguracaoAlertas() {
  const store = useStore();
  const estado = useEstado();
  const { limiares } = preferenciasDe(estado);
  const [dias, setDias] = useState(String(limiares.diasAntecedencia));
  const [saldoMinimo, setSaldoMinimo] = useState(valorParaCampo(limiares.saldoMinimo));
  const [tipos, setTipos] = useState(limiares.tiposAtivos);
  const [erro, setErro] = useState<{ campo?: string; mensagem: string } | null>(null);
  const [salvo, setSalvo] = useState(false);

  const alternar = (tipo: TipoAlerta, ligado: boolean) => {
    setTipos((t) => ({ ...t, [tipo]: ligado }));
    setSalvo(false);
  };

  const salvar = (e: FormEvent) => {
    e.preventDefault();
    setSalvo(false);
    const diasNum = /^\d+$/.test(dias.trim()) ? Number(dias.trim()) : NaN;
    const minimo = parseValor(saldoMinimo);
    if (minimo === null) {
      setErro({ campo: 'saldoMinimo', mensagem: 'Informe um valor válido, como 100,00.' });
      return;
    }
    const proposta = { diasAntecedencia: diasNum, saldoMinimo: minimo, tiposAtivos: tipos };
    const v = validarLimiares(proposta);
    if (!v.ok) {
      setErro({ campo: v.campo, mensagem: v.erro });
      return;
    }
    const r = store.aplicar((s) => definirLimiares(s, proposta));
    if (!r.ok) {
      setErro({ mensagem: r.erro });
      return;
    }
    setErro(null);
    setSalvo(true);
  };

  return (
    <Cartao titulo="Configurar alertas">
      <form className="alertas-config" onSubmit={salvar} noValidate>
        <div className="alertas-config__campos">
          <CampoTexto
            label="Dias de antecedência"
            inputMode="numeric"
            value={dias}
            onChange={(e) => {
              setDias(e.target.value);
              setSalvo(false);
            }}
            dica={`Vale para faturas, lançamentos e metas (de ${DIAS_ANTECEDENCIA_MIN} a ${DIAS_ANTECEDENCIA_MAX}).`}
            erro={erro?.campo === 'diasAntecedencia' ? erro.mensagem : undefined}
          />
          <CampoTexto
            label="Saldo mínimo por conta (R$)"
            inputMode="decimal"
            value={saldoMinimo}
            onChange={(e) => {
              setSaldoMinimo(e.target.value);
              setSalvo(false);
            }}
            dica="Contas com saldo abaixo deste valor geram alerta."
            erro={erro?.campo === 'saldoMinimo' ? erro.mensagem : undefined}
          />
        </div>
        <fieldset className="alertas-config__tipos">
          <legend className="alertas-config__legenda">Tipos de alerta ligados</legend>
          {TIPOS_ALERTA.map((tipo) => (
            <label key={tipo} className="alertas-config__tipo">
              <input type="checkbox" checked={tipos[tipo]} onChange={(e) => alternar(tipo, e.target.checked)} />
              {ROTULO_TIPO_ALERTA[tipo]}
            </label>
          ))}
        </fieldset>
        {erro && !erro.campo ? <Alerta>{erro.mensagem}</Alerta> : null}
        {salvo ? <Alerta tipo="sucesso">Configuração salva.</Alerta> : null}
        <div>
          <Botao type="submit">Salvar configuração</Botao>
        </div>
      </form>
    </Cartao>
  );
}
