import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { serieMensalBeneficiario, type Beneficiario } from '../../domain/beneficiarios';
import { formatarData, nomeMesCurto } from '../../domain/date';
import { formatarMoeda, formatarPercentual } from '../../domain/money';
import { nomeCompleto } from '../../domain/subcategorias';
import type { AppState, DataISO, Resultado } from '../../domain/types';
import { Botao, CampoSelect, CampoTexto } from '../ui';
import '../../styles/tabela-dados.css';

interface Props {
  beneficiario: Beneficiario;
  outros: Beneficiario[];
  estado: AppState;
  hoje: DataISO;
  onRenomear: (nome: string) => Resultado<void>;
  onMesclar: (destino: string) => Resultado<void>;
  onDesfazerMescla: (origem: string) => void;
}

export function DetalheBeneficiario({ beneficiario: b, outros, estado, hoje, onRenomear, onMesclar, onDesfazerMescla }: Props) {
  const [nome, setNome] = useState(estado.beneficiarios?.nomes[b.chave] ?? '');
  const [destino, setDestino] = useState('');
  const [erroNome, setErroNome] = useState<string | undefined>();
  const [erroMescla, setErroMescla] = useState<string | undefined>();
  const serie = serieMensalBeneficiario(estado, b.chave, hoje);

  const renomear = (e: FormEvent) => {
    e.preventDefault();
    const r = onRenomear(nome);
    setErroNome(r.ok ? undefined : r.erro);
  };

  const mesclar = (e: FormEvent) => {
    e.preventDefault();
    const r = onMesclar(destino);
    setErroMescla(r.ok ? undefined : r.erro);
  };

  return (
    <div className="benef-detalhe">
      <dl className="benef-detalhe__numeros">
        <div>
          <dt>Total no período</dt>
          <dd>{formatarMoeda(b.total)}</dd>
        </div>
        <div>
          <dt>Compras</dt>
          <dd>{b.quantidade}</dd>
        </div>
        <div>
          <dt>Ticket médio</dt>
          <dd>{formatarMoeda(b.ticketMedio)}</dd>
        </div>
        <div>
          <dt>Última compra</dt>
          <dd>{formatarData(b.ultima)}</dd>
        </div>
        <div>
          <dt>Categoria mais usada</dt>
          <dd>{nomeCompleto(estado.categorias, b.categoriaId)}</dd>
        </div>
        <div>
          <dt>Intervalo médio</dt>
          <dd>{b.intervaloMedio === null ? '—' : `${b.intervaloMedio} ${b.intervaloMedio === 1 ? 'dia' : 'dias'}`}</dd>
        </div>
        <div>
          <dt>Participação</dt>
          <dd>{formatarPercentual(b.participacao)}</dd>
        </div>
      </dl>
      <Link to={`/transacoes?${new URLSearchParams({ texto: b.descricaoRecente }).toString()}`} className="benef-detalhe__link">
        Ver transações
      </Link>

      <table className="tabela-dados" aria-label={`Total mensal de ${b.nome}`}>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col" className="tabela-dados__num">Total</th>
          </tr>
        </thead>
        <tbody>
          {serie.map((p) => (
            <tr key={p.mes}>
              <th scope="row">{nomeMesCurto(p.mes)}</th>
              <td className="tabela-dados__num">{formatarMoeda(p.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={renomear} noValidate aria-label={`Renomear ${b.nome}`} className="benef-detalhe__form">
        <CampoTexto label="Nome exibido" value={nome} onChange={(e) => setNome(e.target.value)} erro={erroNome} dica="Vazio volta ao nome automático." maxLength={80} />
        <Botao type="submit" variante="secundario">
          Salvar nome
        </Botao>
      </form>

      {outros.length > 0 ? (
        <form onSubmit={mesclar} noValidate aria-label={`Mesclar ${b.nome}`} className="benef-detalhe__form">
          <CampoSelect label="Mesclar em" value={destino} onChange={(e) => setDestino(e.target.value)} erro={erroMescla}>
            <option value="">Selecione…</option>
            {outros.map((o) => (
              <option key={o.chave} value={o.chave}>
                {o.nome}
              </option>
            ))}
          </CampoSelect>
          <Botao type="submit" variante="secundario" disabled={!destino}>
            Mesclar
          </Botao>
        </form>
      ) : null}

      {b.mesclados.length > 0 ? (
        <div>
          <h3 className="benef-detalhe__subtitulo">Descrições mescladas aqui</h3>
          <ul className="benef-detalhe__mesclas">
            {b.mesclados.map((m) => (
              <li key={m}>
                <span>{m}</span>
                <Botao variante="link" aria-label={`Desfazer mescla de ${m}`} onClick={() => onDesfazerMescla(m)}>
                  Desfazer
                </Botao>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
