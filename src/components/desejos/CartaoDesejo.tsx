import { useState, type FormEvent } from 'react';
import { ordenarContas } from '../../domain/contas';
import { formatarData, hojeISO } from '../../domain/date';
import { ROTULO_PRIORIDADE, textoVeredito, type Analise, type Desejo } from '../../domain/desejos';
import { formatarMoeda } from '../../domain/money';
import { nomeCompleto } from '../../domain/subcategorias';
import type { AppState, Resultado } from '../../domain/types';
import { DateField } from '../novos';
import { Badge, type TomBadge } from '../../ds/Badge';
import { Botao, CampoSelect } from '../ui';

interface Props {
  desejo: Desejo;
  analise: Analise;
  estado: AppState;
  onComprar: (contaId: string, data: string) => Resultado<void>;
  onDesistir: () => void;
  onCriarMeta: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}

function CompraForm({ estado, onComprar, onCancelar }: { estado: AppState; onComprar: Props['onComprar']; onCancelar: () => void }) {
  const contas = ordenarContas(estado.contas.filter((c) => !c.arquivada));
  const [contaId, setContaId] = useState(contas[0]?.id ?? '');
  const [data, setData] = useState(hojeISO());
  const [erro, setErro] = useState<{ campo?: string; texto: string } | null>(null);
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = onComprar(contaId, data);
    if (!r.ok) setErro({ campo: r.campo, texto: r.erro });
  };
  return (
    <form onSubmit={enviar} noValidate aria-label="Registrar compra" className="desejo__compra">
      <CampoSelect label="Pago com" value={contaId} onChange={(e) => setContaId(e.target.value)} erro={erro?.campo === 'contaId' ? erro.texto : undefined}>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelect>
      <DateField label="Data da compra" value={data} onChange={setData} erro={erro?.campo === 'data' ? erro.texto : undefined} />
      {erro && !erro.campo ? <p role="alert" className="desejo__erro">{erro.texto}</p> : null}
      <div className="desejo__acoes">
        <Botao type="submit">Confirmar compra</Botao>
        <Botao variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}

const TOM_PRIORIDADE: Record<Desejo['prioridade'], TomBadge> = { alta: 'perigo', media: 'aviso', baixa: 'neutro' };
const TOM_VEREDITO: Record<Analise['veredito']['tipo'], TomBadge> = { pode: 'sucesso', espere: 'aviso', nao: 'perigo' };

export function CartaoDesejo({ desejo, analise, estado, onComprar, onDesistir, onCriarMeta, onEditar, onExcluir }: Props) {
  const [comprando, setComprando] = useState(false);
  const { veredito } = analise;
  return (
    <article className={`desejo desejo--${veredito.tipo}`} aria-label={desejo.nome}>
      <header className="desejo__cabecalho">
        <div>
          <h3 className="desejo__nome">{desejo.nome}</h3>
          <p className="desejo__meta">
            {nomeCompleto(estado.categorias, desejo.categoriaId)} · anotado em {formatarData(desejo.criadoEm)}
          </p>
          <Badge tom={TOM_PRIORIDADE[desejo.prioridade]}>Prioridade {ROTULO_PRIORIDADE[desejo.prioridade].toLowerCase()}</Badge>
        </div>
        <p className="desejo__preco tabular-nums">{formatarMoeda(desejo.preco)}</p>
      </header>
      <p className="desejo__veredito">
        <Badge tom={TOM_VEREDITO[veredito.tipo]}>{textoVeredito(veredito)}</Badge>
      </p>
      <ul className="desejo__verificacoes" aria-label={`Análise de ${desejo.nome}`}>
        {analise.verificacoes.map((v) => (
          <li key={v.id} className={v.aprovada ? 'desejo__ok' : 'desejo__falha'}>
            <strong>
              {v.aprovada ? 'OK' : 'Não'}: {v.titulo}.
            </strong>{' '}
            {v.texto}
          </li>
        ))}
      </ul>
      {comprando ? (
        <CompraForm
          estado={estado}
          onCancelar={() => setComprando(false)}
          onComprar={(contaId, data) => {
            const r = onComprar(contaId, data);
            if (r.ok) setComprando(false);
            return r;
          }}
        />
      ) : (
        <div className="desejo__acoes">
          <Botao onClick={() => setComprando(true)} aria-label={`Comprei ${desejo.nome}`}>
            Comprei
          </Botao>
          <Botao variante="secundario" onClick={onDesistir} aria-label={`Desisti de ${desejo.nome}`}>
            Desisti
          </Botao>
          <Botao variante="secundario" onClick={onCriarMeta} aria-label={`Criar meta para ${desejo.nome}`}>
            Criar meta
          </Botao>
          <Botao variante="link" onClick={onEditar} aria-label={`Editar ${desejo.nome}`}>
            Editar
          </Botao>
          <Botao variante="link" onClick={onExcluir} aria-label={`Excluir ${desejo.nome}`}>
            Excluir
          </Botao>
        </div>
      )}
    </article>
  );
}
