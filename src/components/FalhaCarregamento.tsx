import { useState } from 'react';
import { baixarArquivo } from '../lib/download';
import type { Problema } from '../state/store';
import { useStore } from '../state/store';
import { Alerta, Botao, Cartao } from './ui';
import { ConfirmDialog } from './ConfirmDialog';
import './FalhaCarregamento.css';

/** Tela exibida quando os dados salvos estão corrompidos ou vêm de uma versão mais nova. */
export function FalhaCarregamento({ problema }: { problema: Problema }) {
  const store = useStore();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mensagem =
    problema.tipo === 'corrompido'
      ? 'Os dados salvos neste navegador estão corrompidos e não puderam ser lidos.'
      : `Os dados salvos foram criados por uma versão mais nova do app (esquema ${problema.versao}). Para não perdê-los, o app não vai sobrescrevê-los.`;

  return (
    <main className="falha-raiz">
      <Cartao titulo="Não foi possível carregar seus dados">
        <div className="pilha">
          <Alerta tipo="aviso">{mensagem}</Alerta>
          <p className="falha-texto">
            Exporte o conteúdo bruto para guardar uma cópia. Só depois, se quiser, comece do zero: isso apaga o que está salvo.
          </p>
          {erro ? <Alerta>{erro}</Alerta> : null}
          <div className="linha">
            <Botao variante="secundario" onClick={() => baixarArquivo('financas-dados-brutos.json', problema.bruto)}>
              Exportar conteúdo bruto
            </Botao>
            <Botao variante="perigo" onClick={() => setConfirmando(true)}>
              Começar do zero
            </Botao>
          </div>
        </div>
      </Cartao>
      {confirmando ? (
        <ConfirmDialog
          titulo="Começar do zero?"
          mensagem="Os dados salvos atualmente serão substituídos por um app vazio."
          rotuloConfirmar="Começar do zero"
          perigo
          textoDigitado="APAGAR"
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => {
            const r = store.iniciarVazio();
            if (!r.ok) setErro(r.erro);
            setConfirmando(false);
          }}
        />
      ) : null}
    </main>
  );
}
