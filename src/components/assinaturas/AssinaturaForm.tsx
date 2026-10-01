import { useState, type FormEvent } from 'react';
import { FREQUENCIAS, validarManual, type DadosManual, type FrequenciaAssinatura } from '../../domain/assinaturas';
import { hojeISO } from '../../domain/date';
import { parseValor } from '../../domain/money';
import { Botao, CampoSelect, CampoTexto } from '../ui';
import './AssinaturaForm.css';

interface Props {
  onSalvar: (dados: DadosManual) => { ok: boolean; erro?: string };
  onCancelar: () => void;
}

/** Formulário de assinatura manual, com validação junto ao campo. */
export function AssinaturaForm({ onSalvar, onCancelar }: Props) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [frequencia, setFrequencia] = useState<FrequenciaAssinatura>('mensal');
  const [proxima, setProxima] = useState(hojeISO());
  const [erros, setErros] = useState<Record<string, string>>({});

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(valor);
    const dados: DadosManual = { descricao, valor: centavos ?? 0, frequencia, proximaCobranca: proxima };
    const v = validarManual(dados);
    if (!v.ok) {
      setErros({ [v.campo ?? 'geral']: v.erro });
      return;
    }
    const r = onSalvar(v.valor);
    if (!r.ok) setErros({ geral: r.erro ?? 'Não foi possível salvar.' });
  };

  return (
    <form className="assin-form" onSubmit={enviar} noValidate aria-label="Nova assinatura manual">
      <CampoTexto label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} erro={erros.descricao} maxLength={120} />
      <CampoTexto label="Valor (R$)" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valor} />
      <CampoSelect label="Frequência" value={frequencia} onChange={(e) => setFrequencia(e.target.value as FrequenciaAssinatura)} erro={erros.frequencia}>
        {FREQUENCIAS.map((f) => (
          <option key={f.valor} value={f.valor}>
            {f.rotulo}
          </option>
        ))}
      </CampoSelect>
      <CampoTexto label="Próxima cobrança" type="date" value={proxima} onChange={(e) => setProxima(e.target.value)} erro={erros.proximaCobranca} />
      {erros.geral ? (
        <p role="alert" className="assin-form__erro">
          {erros.geral}
        </p>
      ) : null}
      <div className="assin-form__acoes">
        <Botao type="submit">Salvar assinatura</Botao>
        <Botao variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
