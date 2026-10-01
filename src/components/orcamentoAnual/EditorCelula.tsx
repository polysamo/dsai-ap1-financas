import { useState, type FormEvent } from 'react';
import { nomeMes } from '../../domain/date';
import { parseValor, valorParaCampo } from '../../domain/money';
import type { Centavos, Resultado } from '../../domain/types';
import { Botao, CampoTexto } from '../ui';
import './EditorCelula.css';

export type EscopoLimite = 'celula' | 'todos' | 'apartir';

interface Props {
  categoriaNome: string;
  mes: string;
  /** Limite definido hoje na célula (sem rollover); null se não houver. */
  limiteAtual: Centavos | null;
  onSalvar: (escopo: EscopoLimite, limite: Centavos) => Resultado<void>;
  onRemover: () => Resultado<void>;
  onFechar: () => void;
}

/** Editor do limite de uma célula; o botão pressionado define a abrangência (célula, todo o ano ou dali em diante). */
export function EditorCelula({ categoriaNome, mes, limiteAtual, onSalvar, onRemover, onFechar }: Props) {
  const [texto, setTexto] = useState(limiteAtual === null ? '' : valorParaCampo(limiteAtual));
  const [erro, setErro] = useState<string | undefined>();

  const aplicar = (escopo: EscopoLimite) => {
    const valor = parseValor(texto);
    if (valor === null) return setErro('Informe um valor válido, como 500,00.');
    if (valor < 0) return setErro('O limite não pode ser negativo.');
    const r = onSalvar(escopo, valor);
    setErro(r.ok ? undefined : r.erro);
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    aplicar('celula');
  };

  return (
    <form className="orcanual-editor" onSubmit={enviar} noValidate aria-label={`Edição do limite de ${categoriaNome} em ${nomeMes(mes)}`}>
      <p className="orcanual-editor-titulo">
        {categoriaNome} · <span>{nomeMes(mes)}</span>
      </p>
      <div className="orcanual-editor-campo">
        <CampoTexto
          label={`Limite de ${categoriaNome} em ${nomeMes(mes)}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          erro={erro}
          inputMode="decimal"
          placeholder="0,00"
          autoFocus
        />
      </div>
      <div className="orcanual-editor-acoes">
        <Botao type="submit">Salvar limite</Botao>
        <Botao variante="secundario" onClick={() => aplicar('todos')}>
          Aplicar a todos os meses
        </Botao>
        <Botao variante="secundario" onClick={() => aplicar('apartir')}>
          A partir deste mês
        </Botao>
        {limiteAtual !== null ? (
          <Botao
            variante="secundario"
            onClick={() => {
              const r = onRemover();
              setErro(r.ok ? undefined : r.erro);
            }}
          >
            Remover limite
          </Botao>
        ) : null}
        <Botao variante="secundario" onClick={onFechar}>
          Fechar
        </Botao>
      </div>
    </form>
  );
}
