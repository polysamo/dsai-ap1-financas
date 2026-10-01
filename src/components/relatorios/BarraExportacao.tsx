import { gerarCsv } from '../../domain/exportacao';
import { baixarArquivo } from '../../lib/download';
import { Botao } from '../ui';
import './relatorios.css';

interface Props {
  linhas: string[][];
  nomeArquivo: string;
  desabilitado?: boolean;
}

/** Exporta o relatório em CSV e abre a impressão do navegador para salvar como PDF. */
export function BarraExportacao({ linhas, nomeArquivo, desabilitado }: Props) {
  return (
    <div className="relatorio-exportacao">
      <Botao variante="secundario" disabled={desabilitado} onClick={() => baixarArquivo(nomeArquivo, gerarCsv(linhas), 'text/csv')}>
        Exportar CSV
      </Botao>
      <Botao variante="secundario" onClick={() => window.print()}>
        Exportar PDF
      </Botao>
    </div>
  );
}
