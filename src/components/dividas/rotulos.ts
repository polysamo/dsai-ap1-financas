import type { SistemaAmortizacao, TipoDivida } from '../../domain/types';
import type { SituacaoParcela } from '../../domain/dividas';

export const ROTULO_SISTEMA: Record<SistemaAmortizacao, string> = { price: 'Price (parcelas fixas)', sac: 'SAC (amortização fixa)' };
export const NOME_SISTEMA: Record<SistemaAmortizacao, string> = { price: 'Price', sac: 'SAC' };

export const ROTULO_SITUACAO: Record<SituacaoParcela, string> = { paga: 'Paga', parcial: 'Parcial', atrasada: 'Atrasada', pendente: 'Pendente' };
export const COR_SITUACAO: Record<SituacaoParcela, string> = {
  paga: 'bg-emerald-100 text-emerald-900',
  parcial: 'bg-sky-100 text-sky-900',
  atrasada: 'bg-red-100 text-red-900',
  pendente: 'bg-slate-100 text-slate-800',
};

/** Textos que mudam entre dívida (devo) e empréstimo concedido (emprestei). */
export function rotulosTipo(tipo: TipoDivida) {
  return tipo === 'devo'
    ? { saldo: 'Saldo devedor', parcela: 'Próxima parcela', pagamento: 'Pagamento', registrar: 'Registrar pagamento', pago: 'Total pago', quitada: 'Dívida quitada' }
    : { saldo: 'Saldo a receber', parcela: 'Próxima parcela a receber', pagamento: 'Recebimento', registrar: 'Registrar recebimento', pago: 'Total recebido', quitada: 'Empréstimo quitado' };
}
