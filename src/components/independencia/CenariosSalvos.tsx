import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../ConfirmDialog';
import { Botao, CampoTexto, Cartao, EstadoVazio } from '../ui';
import { formatarMoeda, formatarPercentual } from '../../domain/money';
import {
  MAX_CENARIOS,
  NOME_CENARIO_MAX,
  formatarPrazo,
  simular,
  textoDataEstimada,
  type CenarioIndependencia,
} from '../../domain/independencia';
import './CenariosSalvos.css';
import './TabelaIndependencia.css';

interface Props {
  cenarios: CenarioIndependencia[];
  hoje: string;
  /** Falso quando as premissas do formulário estão inválidas. */
  podeSalvar: boolean;
  /** Devolve a mensagem de erro, ou null quando salvou. */
  onSalvar: (nome: string) => string | null;
  onCarregar: (cenario: CenarioIndependencia) => void;
  onExcluir: (cenario: CenarioIndependencia) => void;
}

export function CenariosSalvos({ cenarios, hoje, podeSalvar, onSalvar, onCarregar, onExcluir }: Props) {
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [excluindo, setExcluindo] = useState<CenarioIndependencia | null>(null);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!podeSalvar) {
      setErro('Corrija as premissas antes de salvar o cenário.');
      return;
    }
    const mensagem = onSalvar(nome);
    setErro(mensagem ?? undefined);
    if (mensagem === null) setNome('');
  };

  return (
    <Cartao titulo="Cenários salvos">
      <form className="indep-salvos__form" onSubmit={enviar} noValidate>
        <div className="indep-salvos__campo">
          <CampoTexto
            label="Nome do cenário"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            erro={erro}
            maxLength={NOME_CENARIO_MAX + 10}
            autoComplete="off"
          />
        </div>
        <Botao type="submit" className="indep-salvos__botao">
          Salvar cenário atual
        </Botao>
      </form>

      {cenarios.length === 0 ? (
        <EstadoVazio titulo="Nenhum cenário salvo">Salve as premissas atuais com um nome para compará-las com outras depois.</EstadoVazio>
      ) : (
        <>
          <div className="indep-tabela__envolt">
            <table className="indep-tabela" aria-label="Comparação dos cenários salvos">
              <thead>
                <tr>
                  <th scope="col">Cenário</th>
                  <th scope="col" className="indep-tabela__num">Aporte mensal</th>
                  <th scope="col" className="indep-tabela__num">Retorno a.a.</th>
                  <th scope="col" className="indep-tabela__num">Alvo</th>
                  <th scope="col" className="indep-tabela__num">Tempo</th>
                  <th scope="col">Data estimada</th>
                  <th scope="col"><span className="indep-salvos__oculto">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {cenarios.map((c) => {
                  const s = simular(c.parametros, undefined, hoje);
                  return (
                    <tr key={c.id}>
                      <th scope="row">{c.nome}</th>
                      <td className="indep-tabela__num">{formatarMoeda(c.parametros.aporteMensal)}</td>
                      <td className="indep-tabela__num">{formatarPercentual(c.parametros.retornoAnualBp / 100)}</td>
                      <td className="indep-tabela__num">{formatarMoeda(s.alvo)}</td>
                      <td className="indep-tabela__num">{s.meses === null ? 'Inalcançável' : formatarPrazo(s.meses)}</td>
                      <td>{textoDataEstimada(s.mesAlvo)}</td>
                      <td>
                        <div className="indep-salvos__acoes">
                          <Botao variante="secundario" onClick={() => onCarregar(c)} aria-label={`Carregar cenário ${c.nome}`}>
                            Carregar
                          </Botao>
                          <Botao variante="perigo" onClick={() => setExcluindo(c)} aria-label={`Excluir cenário ${c.nome}`}>
                            Excluir
                          </Botao>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="indep-salvos__contagem">
            {cenarios.length} de {MAX_CENARIOS} cenários salvos.
          </p>
        </>
      )}

      {excluindo ? (
        <ConfirmDialog
          titulo="Excluir cenário"
          mensagem={`Excluir o cenário "${excluindo.nome}"? Esta ação não pode ser desfeita.`}
          rotuloConfirmar="Excluir"
          perigo
          onConfirmar={() => {
            onExcluir(excluindo);
            setExcluindo(null);
          }}
          onCancelar={() => setExcluindo(null)}
        />
      ) : null}
    </Cartao>
  );
}
