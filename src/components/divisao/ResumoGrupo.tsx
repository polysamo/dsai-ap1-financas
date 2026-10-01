import type { ResumoGrupo as Resumo } from '../../domain/divisao';
import { formatarMoeda } from '../../domain/money';
import './ResumoGrupo.css';

export function ResumoGrupo({ resumo }: { resumo: Resumo }) {
  return (
    <div className="divisao-resumo">
      <dl className="divisao-resumo__totais">
        <div>
          <dt>Total gasto</dt>
          <dd data-testid="resumo-total">{formatarMoeda(resumo.totalGasto)}</dd>
        </div>
        <div>
          <dt>Despesas</dt>
          <dd data-testid="resumo-qtd">{resumo.qtdDespesas}</dd>
        </div>
        <div>
          <dt>Total acertado</dt>
          <dd data-testid="resumo-acertado">{formatarMoeda(resumo.totalAcertado)}</dd>
        </div>
      </dl>
      <table className="divisao-resumo__tabela">
        <caption>Por participante</caption>
        <thead>
          <tr>
            <th scope="col">Participante</th>
            <th scope="col">Pagou</th>
            <th scope="col">Deve</th>
          </tr>
        </thead>
        <tbody>
          {resumo.saldos.map((s) => (
            <tr key={s.participanteId}>
              <th scope="row">{s.nome}</th>
              <td>{formatarMoeda(s.pagou)}</td>
              <td>{formatarMoeda(s.deve)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
