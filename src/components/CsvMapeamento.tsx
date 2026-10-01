import { FORMATOS_DATA } from '../domain/csv';
import type { FormatoData, MapeamentoCsv } from '../domain/types';
import { CampoSelect } from './ui';
import './CsvMapeamento.css';

interface Props {
  colunas: string[];
  mapeamento: MapeamentoCsv;
  onChange: (m: MapeamentoCsv) => void;
}

const NENHUMA = '';

export function CsvMapeamento({ colunas, mapeamento, onChange }: Props) {
  const duasColunas = mapeamento.colValor === null;
  const opcoes = colunas.map((nome, i) => (
    <option key={i} value={i}>
      {`Coluna ${i + 1}${nome ? `: ${nome}` : ''}`}
    </option>
  ));
  const numero = (v: string) => (v === NENHUMA ? null : Number(v));
  const atualizar = (parcial: Partial<MapeamentoCsv>) => onChange({ ...mapeamento, ...parcial });

  return (
    <form aria-label="Mapeamento de colunas" onSubmit={(e) => e.preventDefault()} className="csv-mapeamento">
      <CampoSelect label="Coluna da data" value={mapeamento.colData} onChange={(e) => atualizar({ colData: Number(e.target.value) })}>
        {opcoes}
      </CampoSelect>
      <CampoSelect label="Coluna da descrição" value={mapeamento.colDescricao} onChange={(e) => atualizar({ colDescricao: Number(e.target.value) })}>
        {opcoes}
      </CampoSelect>
      <CampoSelect label="Formato da data" value={mapeamento.formatoData} onChange={(e) => atualizar({ formatoData: e.target.value as FormatoData })}>
        {FORMATOS_DATA.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </CampoSelect>
      <CampoSelect
        label="Como o valor aparece"
        value={duasColunas ? 'duas' : 'uma'}
        onChange={(e) =>
          e.target.value === 'uma'
            ? atualizar({ colValor: mapeamento.colCredito ?? 2, colCredito: null, colDebito: null })
            : atualizar({ colValor: null, colCredito: 2, colDebito: Math.min(3, colunas.length - 1) })
        }
      >
        <option value="uma">Uma coluna, com sinal</option>
        <option value="duas">Colunas separadas de crédito e débito</option>
      </CampoSelect>
      {duasColunas ? (
        <>
          <CampoSelect label="Coluna de crédito" value={mapeamento.colCredito ?? ''} onChange={(e) => atualizar({ colCredito: numero(e.target.value) })}>
            {opcoes}
          </CampoSelect>
          <CampoSelect label="Coluna de débito" value={mapeamento.colDebito ?? ''} onChange={(e) => atualizar({ colDebito: numero(e.target.value) })}>
            {opcoes}
          </CampoSelect>
        </>
      ) : (
        <CampoSelect label="Coluna do valor" value={mapeamento.colValor ?? 0} onChange={(e) => atualizar({ colValor: Number(e.target.value) })}>
          {opcoes}
        </CampoSelect>
      )}
      <label className="csv-mapeamento-cabecalho">
        <input
          type="checkbox"
          checked={mapeamento.temCabecalho}
          onChange={(e) => atualizar({ temCabecalho: e.target.checked })}
        />
        A primeira linha é cabeçalho
      </label>
    </form>
  );
}
