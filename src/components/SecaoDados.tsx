import { useRef, useState } from 'react';
import { Alerta, Botao, Cartao } from './ui';
import { ConfirmDialog } from './ConfirmDialog';
import { gerarExemplo } from '../data/exemplo';
import { hojeISO } from '../domain/date';
import type { AppState } from '../domain/types';
import { baixarArquivo, lerArquivoTexto } from '../lib/download';
import { exportarJson, importarJson } from '../storage/storage';
import { usePreferencias } from '../state/preferencias';
import { useEstado, useStore } from '../state/store';

type Acao = { tipo: 'importar'; estado: AppState } | { tipo: 'apagar' } | { tipo: 'exemplo' } | null;
type Mensagem = { tipo: 'erro' | 'sucesso'; texto: string } | null;

/** Exportar, importar, exemplo e apagar tudo; vive na página Configurações. */
export function SecaoDados() {
  const store = useStore();
  const { redefinir } = usePreferencias();
  const estado = useEstado();
  const [acao, setAcao] = useState<Acao>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const entradaArquivo = useRef<HTMLInputElement>(null);
  const temDados = estado.contas.length > 0 || estado.transacoes.length > 0;

  const exportar = () => {
    baixarArquivo(`financas-${hojeISO()}.json`, exportarJson(estado));
    setMensagem({ tipo: 'sucesso', texto: 'Arquivo de exportação gerado.' });
  };

  const escolherArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setMensagem(null);
    try {
      const r = importarJson(await lerArquivoTexto(arquivo));
      if (!r.ok) setMensagem({ tipo: 'erro', texto: r.erro });
      else setAcao({ tipo: 'importar', estado: r.valor });
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falha ao ler o arquivo.' });
    }
    if (entradaArquivo.current) entradaArquivo.current.value = '';
  };

  const confirmar = () => {
    if (!acao) return;
    if (acao.tipo === 'apagar') {
      store.apagarTudo();
      redefinir();
      setMensagem({ tipo: 'sucesso', texto: 'Todos os dados foram apagados.' });
    } else {
      const novo = acao.tipo === 'importar' ? acao.estado : gerarExemplo(hojeISO());
      const r = store.substituir(novo);
      setMensagem(
        r.ok
          ? { tipo: 'sucesso', texto: acao.tipo === 'importar' ? 'Dados importados.' : 'Dados de exemplo carregados.' }
          : { tipo: 'erro', texto: r.erro },
      );
    }
    setAcao(null);
  };

  return (
    <section aria-labelledby="secao-dados">
      <h2 id="secao-dados" className="mb-3 text-xl font-semibold text-slate-900">
        Dados
      </h2>
      <div className="space-y-4">
        {mensagem ? <Alerta tipo={mensagem.tipo}>{mensagem.texto}</Alerta> : null}
        <Cartao titulo="Backup">
          <p className="mb-3 text-sm text-slate-700">
            Seus dados ficam apenas neste navegador. Exporte um arquivo JSON para guardar uma cópia ou levar para outro computador.
          </p>
          <div className="flex flex-wrap gap-2">
            <Botao onClick={exportar}>Exportar dados</Botao>
            <Botao variante="secundario" onClick={() => entradaArquivo.current?.click()}>
              Importar dados
            </Botao>
            <input
              ref={entradaArquivo}
              type="file"
              accept="application/json,.json"
              aria-label="Arquivo de dados para importar"
              className="sr-only"
              onChange={(e) => void escolherArquivo(e.target.files?.[0])}
            />
          </div>
        </Cartao>
        <Cartao titulo="Dados de exemplo">
          <p className="mb-3 text-sm text-slate-700">Carrega contas, transações, orçamento, metas e recorrências fictícias para explorar o app.</p>
          <Botao variante="secundario" onClick={() => (temDados ? setAcao({ tipo: 'exemplo' }) : confirmarDireto())}>
            Carregar dados de exemplo
          </Botao>
        </Cartao>
        <Cartao titulo="Zona de perigo">
          <p className="mb-3 text-sm text-slate-700">Remove tudo o que o app guardou neste navegador e volta ao primeiro uso.</p>
          <Botao variante="perigo" onClick={() => setAcao({ tipo: 'apagar' })}>
            Apagar todos os dados
          </Botao>
        </Cartao>
      </div>

      {acao?.tipo === 'importar' ? (
        <ConfirmDialog
          titulo="Importar dados?"
          mensagem="O conteúdo atual será substituído pelo do arquivo. Isso não pode ser desfeito."
          rotuloConfirmar="Substituir e importar"
          perigo
          onCancelar={() => setAcao(null)}
          onConfirmar={confirmar}
        />
      ) : null}
      {acao?.tipo === 'exemplo' ? (
        <ConfirmDialog
          titulo="Carregar dados de exemplo?"
          mensagem="Os dados atuais serão substituídos pelos dados de exemplo."
          rotuloConfirmar="Substituir"
          perigo
          onCancelar={() => setAcao(null)}
          onConfirmar={confirmar}
        />
      ) : null}
      {acao?.tipo === 'apagar' ? (
        <ConfirmDialog
          titulo="Apagar todos os dados?"
          mensagem="Contas, transações, orçamento, metas e recorrências serão removidos deste navegador."
          rotuloConfirmar="Apagar tudo"
          perigo
          textoDigitado="APAGAR"
          onCancelar={() => setAcao(null)}
          onConfirmar={confirmar}
        />
      ) : null}
    </section>
  );

  function confirmarDireto() {
    const r = store.substituir(gerarExemplo(hojeISO()));
    setMensagem(r.ok ? { tipo: 'sucesso', texto: 'Dados de exemplo carregados.' } : { tipo: 'erro', texto: r.erro });
  }
}
