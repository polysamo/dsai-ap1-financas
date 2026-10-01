import { useId, useState } from 'react';
import { TabelaAtalhos } from '../components/OnboardingEAtalhos';
import { Botao, Cartao, CampoTexto, EstadoVazio, TituloPagina } from '../components/ui';
import { pedirTour } from '../lib/onboarding';

interface Pergunta {
  pergunta: string;
  resposta: string;
}

export const perguntas: Pergunta[] = [
  { pergunta: 'Onde ficam os meus dados?', resposta: 'Somente no armazenamento local (localStorage) do seu navegador, neste dispositivo. Nada é enviado a servidores, e não há conta nem login.' },
  { pergunta: 'Como faço backup dos meus dados?', resposta: 'Na página Dados, use Exportar para baixar um arquivo JSON com tudo. Guarde-o em local seguro; para restaurar, use Importar e escolha esse arquivo.' },
  { pergunta: 'O que acontece se eu limpar os dados do navegador?', resposta: 'Os dados deste app são apagados junto. Por isso vale exportar um backup de tempos em tempos, principalmente antes de limpar o navegador ou trocar de computador.' },
  { pergunta: 'Como importo o extrato do banco em CSV?', resposta: 'Em Importar CSV, escolha o arquivo, indique a conta de destino e confira o mapeamento das colunas. Você revisa as linhas antes de confirmar, e lançamentos que parecem duplicados são sinalizados.' },
  { pergunta: 'Como funciona a projeção do Dashboard?', resposta: 'A projeção parte do saldo atual e acrescenta, mês a mês, as receitas e despesas recorrentes e as parcelas já lançadas. Ela é uma estimativa baseada no que você cadastrou, não uma previsão.' },
  { pergunta: 'Como cadastro um cartão de crédito?', resposta: 'Em Contas, crie uma conta do tipo cartão e informe dia de fechamento, dia de vencimento e limite. A tela Cartões mostra a fatura de cada mês, o limite usado e o disponível.' },
  { pergunta: 'Como lanço uma compra parcelada?', resposta: 'Na tela Cartões, escolha a compra parcelada e informe valor total, número de parcelas e data da primeira. O app cria uma despesa por mês, e cada parcela cai na fatura do ciclo correto.' },
  { pergunta: 'Pagar a fatura conta como despesa?', resposta: 'Não. O pagamento move dinheiro da conta de origem para o cartão e não entra nos totais de receitas e despesas, porque as compras já foram contadas como despesa.' },
  { pergunta: 'Como funciona o orçamento?', resposta: 'Você define um limite mensal por categoria. O app compara com as despesas do mês e mostra quanto resta ou se o limite foi ultrapassado.' },
  { pergunta: 'Os valores têm erro de arredondamento?', resposta: 'Não. Todos os valores são guardados em centavos inteiros, então somas e parcelas fecham exatamente.' },
  { pergunta: 'Como apago tudo ou carrego dados de exemplo?', resposta: 'Na página Dados você encontra Apagar tudo e Carregar exemplo. As duas ações pedem confirmação antes de substituir o que existe.' },
];

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function AjudaPage() {
  const prefixo = useId();
  const [busca, setBusca] = useState('');
  const [abertas, setAbertas] = useState<ReadonlySet<number>>(new Set());

  const termo = normalizar(busca.trim());
  const visiveis = perguntas.map((p, i) => ({ ...p, i })).filter((p) => normalizar(`${p.pergunta} ${p.resposta}`).includes(termo));

  const alternar = (i: number) => {
    const novo = new Set(abertas);
    if (!novo.delete(i)) novo.add(i);
    setAbertas(novo);
  };

  return (
    <div className="space-y-4">
      <TituloPagina
        acoes={
          <Botao variante="secundario" onClick={pedirTour}>
            Rever o tour
          </Botao>
        }
      >
        Ajuda
      </TituloPagina>

      <Cartao titulo="Perguntas frequentes">
        <CampoTexto label="Buscar nas perguntas" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} autoComplete="off" />
        <div className="mt-3">
          {visiveis.length === 0 ? (
            <EstadoVazio titulo="Nenhuma pergunta encontrada">{`Nada corresponde a "${busca.trim()}". Tente outras palavras.`}</EstadoVazio>
          ) : (
            <ul className="divide-y divide-slate-200">
              {visiveis.map((p) => {
                const aberta = abertas.has(p.i);
                const idResposta = `${prefixo}-r${p.i}`;
                return (
                  <li key={p.i}>
                    <h3>
                      <button
                        type="button"
                        aria-expanded={aberta}
                        aria-controls={idResposta}
                        onClick={() => alternar(p.i)}
                        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <span>{p.pergunta}</span>
                        <span aria-hidden="true">{aberta ? '−' : '+'}</span>
                      </button>
                    </h3>
                    <div id={idResposta} role="region" aria-label={p.pergunta} hidden={!aberta} className="pb-3 text-sm text-slate-700">
                      {p.resposta}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Cartao>

      <Cartao titulo="Atalhos de teclado">
        <TabelaAtalhos />
      </Cartao>
    </div>
  );
}
