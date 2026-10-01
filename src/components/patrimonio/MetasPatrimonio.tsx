import { useState, type FormEvent } from 'react';
import { formatarMoeda, formatarPercentual, parseValor, valorParaCampo } from '../../domain/money';
import { progressoMeta, type DadosMetaPatrimonio, type MetaPatrimonio } from '../../domain/patrimonio';
import type { Resultado } from '../../domain/types';
import { ConfirmDialog } from '../ConfirmDialog';
import { Botao, CampoTexto, EstadoVazio } from '../ui';
import './MetasPatrimonio.css';

interface FormProps {
  inicial?: MetaPatrimonio;
  rotuloSalvar: string;
  onSalvar: (dados: DadosMetaPatrimonio) => Resultado<void>;
  onCancelar?: () => void;
}

function FormMeta({ inicial, rotuloSalvar, onSalvar, onCancelar }: FormProps) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [valor, setValor] = useState(inicial ? valorParaCampo(inicial.valor) : '');
  const [erros, setErros] = useState<{ nome?: string; valor?: string }>({});

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(valor);
    if (centavos === null) {
      setErros({ valor: 'Informe um valor válido, como 250.000,00.' });
      return;
    }
    const r = onSalvar({ nome, valor: centavos });
    if (!r.ok) {
      setErros({ [r.campo === 'valor' ? 'valor' : 'nome']: r.erro });
      return;
    }
    setErros({});
    if (!inicial) {
      setNome('');
      setValor('');
    }
  };

  return (
    <form className="patrim-metas__form" onSubmit={enviar} noValidate aria-label={inicial ? `Editar meta ${inicial.nome}` : 'Nova meta de patrimônio'}>
      <CampoTexto label="Nome da meta" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} autoComplete="off" />
      <CampoTexto label="Valor da meta (R$)" value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valor} inputMode="decimal" autoComplete="off" />
      <div className="patrim-metas__acoes">
        <Botao type="submit">{rotuloSalvar}</Botao>
        {onCancelar ? (
          <Botao variante="secundario" onClick={onCancelar}>
            Cancelar
          </Botao>
        ) : null}
      </div>
    </form>
  );
}

interface Props {
  metas: MetaPatrimonio[];
  patrimonio: number;
  onCriar: (dados: DadosMetaPatrimonio) => Resultado<void>;
  onEditar: (id: string, dados: DadosMetaPatrimonio) => Resultado<void>;
  onExcluir: (id: string) => void;
}

export function MetasPatrimonio({ metas, patrimonio, onCriar, onEditar, onExcluir }: Props) {
  const [editando, setEditando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<MetaPatrimonio | null>(null);

  return (
    <div className="patrim-metas">
      {metas.length === 0 ? (
        <EstadoVazio titulo="Nenhuma meta de patrimônio">Defina um valor para acompanhar quanto falta para chegar lá.</EstadoVazio>
      ) : (
        <ul className="patrim-metas__lista" aria-label="Metas de patrimônio">
          {metas.map((m) => {
            const p = progressoMeta(m, patrimonio);
            if (editando === m.id) {
              return (
                <li key={m.id} className="patrim-metas__item">
                  <FormMeta
                    inicial={m}
                    rotuloSalvar="Salvar meta"
                    onSalvar={(dados) => {
                      const r = onEditar(m.id, dados);
                      if (r.ok) setEditando(null);
                      return r;
                    }}
                    onCancelar={() => setEditando(null)}
                  />
                </li>
              );
            }
            return (
              <li key={m.id} className="patrim-metas__item">
                <div className="patrim-metas__cabecalho">
                  <strong>{m.nome}</strong>
                  <span className="patrim-metas__valor">{formatarMoeda(m.valor)}</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`Progresso da meta ${m.nome}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={p.pct}
                  aria-valuetext={`${formatarPercentual(p.pct)} da meta`}
                  className="patrim-metas__trilho"
                >
                  <div className="patrim-metas__preenchimento" style={{ width: `${p.pct}%` }} />
                </div>
                <p className="patrim-metas__texto">
                  <span data-testid={`meta-pct-${m.nome}`}>{formatarPercentual(p.pct)}</span> concluído ·{' '}
                  {p.atingida ? <strong className="patrim-metas__ok">Meta atingida</strong> : <span>Faltam {formatarMoeda(p.falta)}</span>}
                </p>
                <div className="patrim-metas__acoes">
                  <Botao variante="secundario" aria-label={`Editar meta ${m.nome}`} onClick={() => setEditando(m.id)}>
                    Editar
                  </Botao>
                  <Botao variante="secundario" aria-label={`Excluir meta ${m.nome}`} onClick={() => setExcluindo(m)}>
                    Excluir
                  </Botao>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="patrim-metas__titulo">Nova meta</h3>
      <FormMeta rotuloSalvar="Adicionar meta" onSalvar={onCriar} />

      {excluindo ? (
        <ConfirmDialog
          titulo="Excluir meta"
          mensagem={`Excluir a meta "${excluindo.nome}"? Esta ação não pode ser desfeita.`}
          rotuloConfirmar="Excluir"
          perigo
          onCancelar={() => setExcluindo(null)}
          onConfirmar={() => {
            onExcluir(excluindo.id);
            setExcluindo(null);
          }}
        />
      ) : null}
    </div>
  );
}
