import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../ds/Button';
import { Checkbox } from '../ds/Checkbox';
import { Combobox } from '../ds/Combobox';
import { CurrencyInput } from '../ds/CurrencyInput';
import { IconButton } from '../ds/IconButton';
import { Input } from '../ds/Input';
import { RadioGroup } from '../ds/Radio';
import { SearchInput } from '../ds/SearchInput';
import { Select } from '../ds/Select';
import { Slider } from '../ds/Slider';
import { Spinner } from '../ds/Spinner';
import { Switch } from '../ds/Switch';
import { Textarea } from '../ds/Textarea';

describe('ds: Button, IconButton e Spinner', () => {
  it('variantes e tamanho viram classes e o clique funciona', async () => {
    const aoClicar = vi.fn();
    render(<Button variante="perigo" tamanho="pequeno" onClick={aoClicar}>Excluir</Button>);
    const botao = screen.getByRole('button', { name: 'Excluir' });
    expect(botao).toHaveClass('ds-botao--perigo', 'ds-botao--pequeno');
    expect(botao).toHaveAttribute('type', 'button');
    await userEvent.click(botao);
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it('carregando marca aria-busy, mostra o spinner e não dispara clique', async () => {
    const aoClicar = vi.fn();
    render(<Button carregando onClick={aoClicar}>Salvar</Button>);
    const botao = screen.getByRole('button', { name: /Salvar/ });
    expect(botao).toHaveAttribute('aria-busy', 'true');
    expect(botao).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    await userEvent.click(botao);
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it('desabilitado não dispara clique e o teclado aciona com Enter e Espaço', async () => {
    const aoClicar = vi.fn();
    const { rerender } = render(<Button onClick={aoClicar}>Ok</Button>);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(aoClicar).toHaveBeenCalledTimes(2);
    rerender(<Button disabled onClick={aoClicar}>Ok</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(aoClicar).toHaveBeenCalledTimes(2);
  });

  it('IconButton tem nome acessível e esconde o ícone', () => {
    render(<IconButton aria-label="Fechar" icone="✕" />);
    const botao = screen.getByRole('button', { name: 'Fechar' });
    expect(botao.querySelector('[aria-hidden="true"]')).toHaveTextContent('✕');
  });

  it('Spinner tem role status e texto personalizável', () => {
    render(<Spinner rotulo="Importando" tamanho="grande" />);
    expect(screen.getByRole('status')).toHaveTextContent('Importando');
  });
});

describe('ds: Input, Textarea e Select', () => {
  it('rótulo ligado, dica descrevendo e erro com role alert', () => {
    const { rerender } = render(<Input label="Nome" dica="Como no documento" />);
    const campo = screen.getByLabelText('Nome');
    expect(campo).toHaveAccessibleDescription('Como no documento');
    expect(campo).not.toHaveAttribute('aria-invalid');
    rerender(<Input label="Nome" dica="Como no documento" erro="Obrigatório" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Obrigatório');
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Nome')).toHaveAccessibleDescription('Obrigatório');
    expect(screen.getByLabelText('Nome')).toHaveClass('ds-controle--erro');
  });

  it('digitação, disabled e className', async () => {
    const aoMudar = vi.fn();
    render(<Input label="Cidade" className="extra" onChange={aoMudar} />);
    await userEvent.type(screen.getByLabelText('Cidade'), 'Belém');
    expect(aoMudar).toHaveBeenCalledTimes(5);
    expect(screen.getByLabelText('Cidade')).toHaveClass('extra');
  });

  it('Textarea e Select seguem o mesmo contrato', async () => {
    render(
      <>
        <Textarea label="Observação" erro="Muito longa" />
        <Select label="Tipo" defaultValue="b">
          <option value="a">A</option>
          <option value="b">B</option>
        </Select>
      </>,
    );
    expect(screen.getByLabelText('Observação')).toHaveAttribute('aria-invalid', 'true');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'a');
    expect(screen.getByLabelText('Tipo')).toHaveValue('a');
  });
});

describe('ds: CurrencyInput e SearchInput', () => {
  function Moeda({ inicial = null }: { inicial?: number | null }) {
    const [v, setV] = useState<number | null>(inicial);
    return (
      <>
        <CurrencyInput label="Valor" value={v} onChange={setV} />
        <output data-testid="saida">{v === null ? 'nulo' : v}</output>
      </>
    );
  }

  it('entrega centavos inteiros e aceita vírgula e milhar', async () => {
    render(<Moeda />);
    await userEvent.type(screen.getByLabelText('Valor'), '1.234,56');
    expect(screen.getByTestId('saida')).toHaveTextContent('123456');
  });

  it('texto inválido mostra erro e entrega nulo; vazio não é erro', async () => {
    render(<Moeda inicial={1000} />);
    const campo = screen.getByLabelText('Valor');
    expect(campo).toHaveValue('10,00');
    await userEvent.type(campo, 'x');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um valor como 1.234,56.');
    expect(screen.getByTestId('saida')).toHaveTextContent('nulo');
    await userEvent.clear(campo);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('SearchInput limpa pelo botão e pela tecla Esc', async () => {
    function Busca() {
      const [t, setT] = useState('padaria');
      return <SearchInput label="Buscar" value={t} onChange={setT} />;
    }
    render(<Busca />);
    const campo = screen.getByLabelText('Buscar');
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(campo).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument();
    await userEvent.type(campo, 'abc{Escape}');
    expect(campo).toHaveValue('');
  });
});

describe('ds: Checkbox, RadioGroup, Switch e Slider', () => {
  it('Checkbox alterna com clique e Espaço e mostra erro', async () => {
    const aoMudar = vi.fn();
    render(<Checkbox label="Aceito" onChange={aoMudar} erro="Obrigatório" />);
    const caixa = screen.getByRole('checkbox', { name: 'Aceito' });
    expect(caixa).toHaveAccessibleDescription('Obrigatório');
    await userEvent.click(caixa);
    await userEvent.keyboard(' ');
    expect(aoMudar).toHaveBeenCalledTimes(2);
  });

  function Grupo() {
    const [v, setV] = useState('b');
    return (
      <RadioGroup
        legenda="Ordem"
        value={v}
        onChange={setV}
        opcoes={[
          { valor: 'a', rotulo: 'Crescente' },
          { valor: 'b', rotulo: 'Decrescente' },
          { valor: 'c', rotulo: 'Bloqueada', desabilitado: true },
          { valor: 'd', rotulo: 'Aleatória' },
        ]}
      />
    );
  }

  it('RadioGroup: grupo nomeado, uma opção marcada e setas pulam as desabilitadas', async () => {
    render(<Grupo />);
    expect(screen.getByRole('group', { name: 'Ordem' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Decrescente' })).toBeChecked();
    screen.getByRole('radio', { name: 'Decrescente' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Aleatória' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Aleatória' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Crescente' })).toBeChecked();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: 'Aleatória' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Bloqueada' })).toBeDisabled();
  });

  it('Switch tem role switch, aria-checked e responde a clique, Espaço e Enter', async () => {
    function Interruptor() {
      const [on, setOn] = useState(false);
      return <Switch label="Tema escuro" checked={on} onChange={setOn} dica="Vale neste aparelho" />;
    }
    render(<Interruptor />);
    const chave = screen.getByRole('switch', { name: 'Tema escuro' });
    expect(chave).toHaveAttribute('aria-checked', 'false');
    expect(chave).toHaveAccessibleDescription('Vale neste aparelho');
    await userEvent.click(chave);
    expect(chave).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard(' ');
    expect(chave).toHaveAttribute('aria-checked', 'false');
    await userEvent.keyboard('{Enter}');
    expect(chave).toHaveAttribute('aria-checked', 'true');
  });

  it('Switch desabilitado não muda', async () => {
    const aoMudar = vi.fn();
    render(<Switch label="X" checked={false} onChange={aoMudar} disabled />);
    await userEvent.click(screen.getByRole('switch'));
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it('Slider: faixa, valor formatado e mudança', () => {
    function Controle() {
      const [v, setV] = useState(50);
      return <Slider label="Meta" min={0} max={100} step={10} value={v} onChange={setV} formatar={(n) => `${n}%`} />;
    }
    render(<Controle />);
    const slider = screen.getByRole('slider', { name: 'Meta' });
    expect(slider).toHaveAttribute('aria-valuetext', '50%');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    fireEvent.change(slider, { target: { value: '60' } });
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuetext', '60%');
  });
});

describe('ds: Combobox', () => {
  const opcoes = [
    { valor: 'ali', rotulo: 'Alimentação' },
    { valor: 'laz', rotulo: 'Lazer' },
    { valor: 'sau', rotulo: 'Saúde' },
  ];
  function Caixa({ aoMudar = () => {} }: { aoMudar?: (v: string) => void }) {
    const [v, setV] = useState('');
    return <Combobox label="Categoria" opcoes={opcoes} value={v} onChange={(x) => { setV(x); aoMudar(x); }} />;
  }

  it('filtra sem acento ao digitar, escolhe com Enter e mostra o rótulo', async () => {
    const aoMudar = vi.fn();
    render(<Caixa aoMudar={aoMudar} />);
    const campo = screen.getByRole('combobox', { name: 'Categoria' });
    expect(campo).toHaveAttribute('aria-expanded', 'false');
    await userEvent.type(campo, 'saude');
    expect(campo).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.keyboard('{Enter}');
    expect(aoMudar).toHaveBeenCalledWith('sau');
    expect(campo).toHaveValue('Saúde');
    expect(campo).toHaveAttribute('aria-expanded', 'false');
  });

  it('setas movem a opção ativa (aria-activedescendant) e Esc fecha', async () => {
    render(<Caixa />);
    const campo = screen.getByRole('combobox', { name: 'Categoria' });
    await userEvent.click(campo);
    const itens = screen.getAllByRole('option');
    expect(itens).toHaveLength(3);
    await userEvent.keyboard('{ArrowDown}');
    expect(campo).toHaveAttribute('aria-activedescendant', itens[1].id);
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(campo).toHaveAttribute('aria-activedescendant', itens[2].id);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clicar numa opção escolhe e sem resultado mostra aviso', async () => {
    const aoMudar = vi.fn();
    render(<Caixa aoMudar={aoMudar} />);
    const campo = screen.getByRole('combobox');
    await userEvent.click(campo);
    await userEvent.click(screen.getByRole('option', { name: 'Lazer' }));
    expect(aoMudar).toHaveBeenCalledWith('laz');
    await userEvent.clear(campo);
    await userEvent.type(campo, 'zzz');
    expect(screen.getByText('Nenhuma opção')).toBeInTheDocument();
  });
});
