import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker, dataDaExibicao, mascaraData } from '../ds/DatePicker';
import { DateRangePicker, type Intervalo } from '../ds/DateRangePicker';

describe('ds: máscara e conversão de datas', () => {
  it('mascaraData insere barras, descarta letras e limita a 8 dígitos', () => {
    expect(['1', '12', '123', '1234', '12345', 'ab12/3x4', '123456789'].map(mascaraData)).toEqual(['1', '12', '12/3', '12/34', '12/34/5', '12/34', '12/34/5678']);
  });

  it('dataDaExibicao converte para AAAA-MM-DD e rejeita datas inexistentes', () => {
    expect(dataDaExibicao('05/10/2026')).toBe('2026-10-05');
    expect(dataDaExibicao('29/02/2028')).toBe('2028-02-29');
    expect(dataDaExibicao('29/02/2026')).toBe('');
    expect(dataDaExibicao('31/04/2026')).toBe('');
    expect(dataDaExibicao('05/10/26')).toBe('');
  });
});

describe('ds: DatePicker', () => {
  function Exemplo({ inicial = '' }: { inicial?: string }) {
    const [v, setV] = useState(inicial);
    return (
      <>
        <DatePicker label="Data" value={v} onChange={setV} />
        <output data-testid="iso">{v || 'vazio'}</output>
      </>
    );
  }

  it('mostra o valor em dd/mm/aaaa e entrega AAAA-MM-DD ao digitar com máscara', async () => {
    render(<Exemplo inicial="2026-10-05" />);
    const campo = screen.getByLabelText('Data');
    expect(campo).toHaveValue('05/10/2026');
    await userEvent.clear(campo);
    await userEvent.type(campo, '25122026');
    expect(campo).toHaveValue('25/12/2026');
    expect(screen.getByTestId('iso')).toHaveTextContent('2026-12-25');
  });

  it('enquanto incompleta entrega vazio sem erro; completa e inexistente mostra erro', async () => {
    render(<Exemplo />);
    const campo = screen.getByLabelText('Data');
    await userEvent.type(campo, '3102');
    expect(screen.getByTestId('iso')).toHaveTextContent('vazio');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await userEvent.type(campo, '2026');
    expect(screen.getByRole('alert')).toHaveTextContent('Essa data não existe.');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('iso')).toHaveTextContent('vazio');
  });

  it('erro recebido por props tem prioridade', () => {
    render(<DatePicker label="Vencimento" value="" onChange={() => {}} erro="Informe a data." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Informe a data.');
  });

  it('calendário: abre, mostra o mês do valor, escolhe um dia e fecha', async () => {
    render(<Exemplo inicial="2026-10-05" />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir calendário' }));
    const calendario = screen.getByRole('dialog', { name: 'Calendário' });
    expect(within(calendario).getByText(/outubro/i)).toBeInTheDocument();
    expect(within(calendario).getByRole('gridcell', { name: '05/10/2026' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(calendario).getByRole('gridcell', { name: '20/10/2026' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Data')).toHaveValue('20/10/2026');
    expect(screen.getByTestId('iso')).toHaveTextContent('2026-10-20');
  });

  it('calendário navega entre meses (virada de ano) e Esc fecha', async () => {
    render(<Exemplo inicial="2026-12-15" />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir calendário' }));
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText(/janeiro de 2027/i)).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '31/01/2027' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText(/novembro de 2026/i)).toBeInTheDocument();
    expect(screen.queryByRole('gridcell', { name: '31/11/2026' })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fevereiro bissexto tem 29 dias no calendário', async () => {
    render(<Exemplo inicial="2028-02-10" />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir calendário' }));
    expect(screen.getByRole('gridcell', { name: '29/02/2028' })).toBeInTheDocument();
    expect(screen.queryByRole('gridcell', { name: '30/02/2028' })).not.toBeInTheDocument();
  });
});

describe('ds: DateRangePicker', () => {
  function Intervalo2({ aoMudar = () => {} }: { aoMudar?: (i: Intervalo) => void }) {
    const [v, setV] = useState<Intervalo>({ inicio: '', fim: '' });
    return <DateRangePicker legenda="Período" value={v} onChange={(i) => { setV(i); aoMudar(i); }} />;
  }

  it('entrega início e fim em AAAA-MM-DD', async () => {
    const aoMudar = vi.fn();
    render(<Intervalo2 aoMudar={aoMudar} />);
    expect(screen.getByRole('group', { name: 'Período' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Início'), '01102026');
    await userEvent.type(screen.getByLabelText('Fim'), '31102026');
    expect(aoMudar).toHaveBeenLastCalledWith({ inicio: '2026-10-01', fim: '2026-10-31' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('recusa fim antes do início com erro no campo Fim', async () => {
    render(<Intervalo2 />);
    await userEvent.type(screen.getByLabelText('Início'), '15102026');
    await userEvent.type(screen.getByLabelText('Fim'), '10102026');
    expect(screen.getByRole('alert')).toHaveTextContent('O fim não pode ser antes do início.');
    expect(screen.getByLabelText('Fim')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Início')).not.toHaveAttribute('aria-invalid');
  });
});
