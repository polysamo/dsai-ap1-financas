import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ConfiguracaoAlertas } from '../components/ConfiguracaoAlertas';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Botao, Cartao, CampoTexto, EstadoVazio, TituloPagina } from '../components/ui';
import {
  ROTULO_SEVERIDADE,
  calcularAlertas,
  contarPorSeveridade,
  dispensarAlerta,
  preferenciasDe,
  restaurarAlerta,
  separarAlertas,
  type Alerta,
  type Severidade,
} from '../domain/alertas';
import { formatarData, hojeISO } from '../domain/date';
import { useEstado, useStore } from '../state/store';
import './AlertasPage.css';

type Filtro = 'todos' | Severidade;

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'critico', rotulo: ROTULO_SEVERIDADE.critico },
  { valor: 'atencao', rotulo: ROTULO_SEVERIDADE.atencao },
  { valor: 'info', rotulo: ROTULO_SEVERIDADE.info },
];

function ItemAlerta({ alerta, hoje }: { alerta: Alerta; hoje: string }) {
  const store = useStore();
  const [adiando, setAdiando] = useState(false);
  const [data, setData] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [confirmando, setConfirmando] = useState(false);

  const adiar = (e: FormEvent) => {
    e.preventDefault();
    const r = store.aplicar((s) => dispensarAlerta(s, alerta.id, hoje, data));
    if (!r.ok) setErro(r.erro);
  };

  return (
    <li className={`alertas-item alertas-item--${alerta.severidade}`}>
      <div className="alertas-item__cabecalho">
        <span className={`alertas-selo alertas-selo--${alerta.severidade}`}>{ROTULO_SEVERIDADE[alerta.severidade]}</span>
        <h3 className="alertas-item__titulo">{alerta.titulo}</h3>
      </div>
      <p className="alertas-item__descricao">{alerta.descricao}</p>
      <div className="alertas-item__acoes">
        <Link to={alerta.link} className="alertas-item__link" aria-label={`Ver detalhes: ${alerta.titulo}`}>
          Ver detalhes
        </Link>
        <Botao variante="secundario" onClick={() => setAdiando((v) => !v)} aria-expanded={adiando} aria-label={`Adiar: ${alerta.titulo}`}>
          Adiar
        </Botao>
        <Botao variante="secundario" onClick={() => setConfirmando(true)} aria-label={`Dispensar: ${alerta.titulo}`}>
          Dispensar
        </Botao>
      </div>
      {adiando ? (
        <form className="alertas-item__adiar" onSubmit={adiar} noValidate>
          <CampoTexto
            label="Voltar a mostrar em"
            type="date"
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setErro(undefined);
            }}
            erro={erro}
          />
          <Botao type="submit">Adiar até a data</Botao>
        </form>
      ) : null}
      {confirmando ? (
        <ConfirmDialog
          titulo="Dispensar alerta?"
          mensagem={`"${alerta.titulo}" deixará de aparecer até você restaurá-lo na seção Dispensados.`}
          rotuloConfirmar="Dispensar de vez"
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => {
            store.aplicar((s) => dispensarAlerta(s, alerta.id, hoje));
            setConfirmando(false);
          }}
        />
      ) : null}
    </li>
  );
}

export function AlertasPage() {
  const store = useStore();
  const estado = useEstado();
  const hoje = hojeISO();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [configurando, setConfigurando] = useState(false);

  const { visiveis, dispensados } = separarAlertas(calcularAlertas(estado, hoje), preferenciasDe(estado), hoje);
  const contagem = contarPorSeveridade(visiveis);
  const mostrados = filtro === 'todos' ? visiveis : visiveis.filter((a) => a.severidade === filtro);
  const contar = (f: Filtro) => (f === 'todos' ? visiveis.length : contagem[f]);

  return (
    <div>
      <TituloPagina
        acoes={
          <Botao variante="secundario" onClick={() => setConfigurando((v) => !v)} aria-expanded={configurando}>
            Configurar alertas
          </Botao>
        }
      >
        Alertas
      </TituloPagina>
      <div className="alertas-pagina">
        {configurando ? <ConfiguracaoAlertas /> : null}

        <div role="group" aria-label="Filtrar por severidade" className="alertas-filtros">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              className="alertas-filtro"
              aria-pressed={filtro === f.valor}
              onClick={() => setFiltro(f.valor)}
            >
              {f.rotulo} ({contar(f.valor)})
            </button>
          ))}
        </div>

        {visiveis.length === 0 ? (
          <EstadoVazio titulo="Tudo em dia">Nenhum orçamento, fatura, lançamento, saldo ou meta pede atenção agora.</EstadoVazio>
        ) : mostrados.length === 0 ? (
          <EstadoVazio titulo="Nenhum alerta com esta severidade">Escolha outro filtro para ver os demais alertas.</EstadoVazio>
        ) : (
          <ul className="alertas-lista" aria-label="Alertas">
            {mostrados.map((a) => (
              <ItemAlerta key={a.id} alerta={a} hoje={hoje} />
            ))}
          </ul>
        )}

        {dispensados.length > 0 ? (
          <Cartao titulo={`Dispensados (${dispensados.length})`}>
            <ul className="alertas-dispensados">
              {dispensados.map(({ alerta, ate }) => (
                <li key={alerta.id} className="alertas-dispensados__item">
                  <span>
                    {alerta.titulo}
                    <span className="alertas-dispensados__nota">{ate ? ` — volta em ${formatarData(ate)}` : ' — dispensado de vez'}</span>
                  </span>
                  <Botao
                    variante="secundario"
                    aria-label={`Restaurar: ${alerta.titulo}`}
                    onClick={() => store.aplicar((s) => restaurarAlerta(s, alerta.id))}
                  >
                    Restaurar
                  </Botao>
                </li>
              ))}
            </ul>
          </Cartao>
        ) : null}
      </div>
    </div>
  );
}
