import { useMemo, useState } from 'react';
import { csvPorCategoria, nomeArquivoRelatorio } from '../../domain/exportacao';
import { hojeISO, primeiroDia } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import { relatorioPorCategoria } from '../../domain/relatorios';
import type { TipoMovimento } from '../../domain/types';
import { useEstado } from '../../state/store';
import { CampoSelect, CampoTexto, Cartao, EstadoVazio } from '../ui';
import { BarraExportacao } from './BarraExportacao';

export function RelatorioCategoriaView() {
  const estado = useEstado();
  const hoje = hojeISO();
  const [de, setDe] = useState(primeiroDia(hoje.slice(0, 7)));
  const [ate, setAte] = useState(hoje);
  const [tipo, setTipo] = useState<TipoMovimento>('despesa');
  const [contaId, setContaId] = useState('');

  const resultado = useMemo(() => relatorioPorCategoria(estado, { de, ate, tipo, contaId: contaId || undefined }), [estado, de, ate, tipo, contaId]);
  const relatorio = resultado.ok ? resultado.valor : null;

  return (
    <div className="space-y-4">
      <p className="hidden text-lg font-semibold print:block">Relatório por categoria: {de} a {ate}</p>
      <Cartao>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          <CampoTexto label="Data inicial" type="date" value={de} onChange={(e) => setDe(e.target.value)} erro={!resultado.ok && resultado.campo === 'de' ? resultado.erro : undefined} />
          <CampoTexto label="Data final" type="date" value={ate} onChange={(e) => setAte(e.target.value)} erro={!resultado.ok && resultado.campo === 'ate' ? resultado.erro : undefined} />
          <CampoSelect label="Tipo de lançamento" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimento)}>
            <option value="despesa">Despesas</option>
            <option value="receita">Receitas</option>
          </CampoSelect>
          <CampoSelect label="Conta" value={contaId} onChange={(e) => setContaId(e.target.value)}>
            <option value="">Todas as contas</option>
            {estado.contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </CampoSelect>
        </div>
        <div className="mt-3">
          <BarraExportacao linhas={relatorio ? csvPorCategoria(relatorio) : []} nomeArquivo={nomeArquivoRelatorio('categorias', `${de}_a_${ate}`)} desabilitado={!relatorio || relatorio.quantidade === 0} />
        </div>
      </Cartao>

      {relatorio && relatorio.linhas.length === 0 ? <EstadoVazio titulo="Nenhuma transação no período">Ajuste o período, o tipo ou a conta.</EstadoVazio> : null}

      {relatorio && relatorio.linhas.length > 0 ? (
        <Cartao>
          <table className="w-full text-left text-sm" aria-label="Relatório por categoria">
            <thead>
              <tr className="text-slate-600">
                <th scope="col" className="py-1 font-medium">Categoria</th>
                <th scope="col" className="py-1 text-right font-medium">Total</th>
                <th scope="col" className="py-1 text-right font-medium">Quantidade</th>
                <th scope="col" className="py-1 text-right font-medium">Valor médio</th>
              </tr>
            </thead>
            <tbody>
              {relatorio.linhas.map((l) => (
                <tr key={l.categoriaId} className="border-t border-slate-200" data-testid={`cat-${l.categoriaId}`}>
                  <th scope="row" className="py-1 font-normal">{l.nome}</th>
                  <td className="py-1 text-right tabular-nums">{formatarMoeda(l.total)}</td>
                  <td className="py-1 text-right tabular-nums">{l.quantidade}</td>
                  <td className="py-1 text-right tabular-nums">{formatarMoeda(l.medio)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300 font-medium">
                <th scope="row" className="py-1">Total</th>
                <td className="py-1 text-right tabular-nums" data-testid="cat-total">{formatarMoeda(relatorio.total)}</td>
                <td className="py-1 text-right tabular-nums">{relatorio.quantidade}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </Cartao>
      ) : null}
    </div>
  );
}
