import { Alerta, Cartao, TituloPagina } from '../components/ui';
import { SecaoDados } from '../components/SecaoDados';
import type { Tema } from '../lib/preferencias';
import { usePreferencias } from '../state/preferencias';
import './ConfiguracoesPage.css';

const OPCOES_TEMA: { valor: Tema; rotulo: string; descricao: string }[] = [
  { valor: 'claro', rotulo: 'Claro', descricao: 'Fundo claro, sempre.' },
  { valor: 'escuro', rotulo: 'Escuro', descricao: 'Fundo escuro, sempre.' },
  { valor: 'sistema', rotulo: 'Sistema', descricao: 'Segue a configuração do seu dispositivo.' },
];

export function ConfiguracoesPage() {
  const { preferencias, erro, alterar } = usePreferencias();
  const oculto = preferencias.ocultarValores;

  return (
    <div>
      <TituloPagina>Configurações</TituloPagina>
      <div className="pilha pilha--g">
        {erro ? <Alerta tipo="erro">{erro}</Alerta> : null}

        <section aria-labelledby="secao-aparencia">
          <h2 id="secao-aparencia" className="config-titulo-secao">
            Aparência
          </h2>
          <Cartao>
            <div role="radiogroup" aria-labelledby="rotulo-tema" className="pilha pilha--p">
              <p id="rotulo-tema" className="config-rotulo-grupo">
                Tema
              </p>
              {OPCOES_TEMA.map((o) => (
                <label key={o.valor} className="config-opcao">
                  <input
                    type="radio"
                    name="tema"
                    value={o.valor}
                    checked={preferencias.tema === o.valor}
                    onChange={() => alterar({ tema: o.valor })}
                    className="config-opcao__radio"
                  />
                  <span>
                    <span className="config-opcao__nome">{o.rotulo}</span>
                    <span className="config-opcao__descricao">{o.descricao}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="config-moeda">Moeda: real brasileiro (BRL)</p>
          </Cartao>
        </section>

        <section aria-labelledby="secao-privacidade">
          <h2 id="secao-privacidade" className="config-titulo-secao">
            Privacidade
          </h2>
          <Cartao>
            <div className="config-privacidade">
              <div>
                <p id="rotulo-ocultar" className="config-privacidade__titulo">
                  Ocultar valores
                </p>
                <p id="dica-ocultar" className="config-privacidade__dica">
                  Desfoca os valores em reais na tela, útil para usar o app em público.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={oculto}
                aria-labelledby="rotulo-ocultar"
                aria-describedby="dica-ocultar"
                onClick={() => alterar({ ocultarValores: !oculto })}
                className="config-interruptor"
              >
                <span aria-hidden="true" className={`config-interruptor__ponto${oculto ? ' config-interruptor__ponto--ligado' : ''}`} />
                {oculto ? 'Ligado' : 'Desligado'}
              </button>
            </div>
          </Cartao>
        </section>

        <SecaoDados />
      </div>
    </div>
  );
}
