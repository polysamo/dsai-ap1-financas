import { useState, type FormEvent } from 'react';
import { ATIVO_NOME_MAX, CLASSES, type DadosAtivo } from '../../domain/investimentos';
import type { ClasseAtivo, Resultado } from '../../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from '../ui';
import './investimentos.css';

interface Props {
  onSalvar: (dados: DadosAtivo) => Resultado<void>;
  onCancelar: () => void;
}

type Erros = Partial<Record<'nome' | 'classe' | 'geral', string>>;

export function AtivoForm({ onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState('');
  const [classe, setClasse] = useState<ClasseAtivo | ''>('');
  const [erros, setErros] = useState<Erros>({});

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = onSalvar({ nome, classe: classe as ClasseAtivo });
    if (!r.ok) setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
  };

  return (
    <form onSubmit={enviar} noValidate aria-label="Novo ativo" className="invest-form invest-form-2">
      <CampoTexto label="Nome do ativo" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} maxLength={ATIVO_NOME_MAX + 20} autoComplete="off" />
      <CampoSelect label="Classe" value={classe} onChange={(e) => setClasse(e.target.value as ClasseAtivo)} erro={erros.classe}>
        <option value="">Selecione…</option>
        {CLASSES.map((c) => (
          <option key={c.valor} value={c.valor}>{c.rotulo}</option>
        ))}
      </CampoSelect>
      {erros.geral ? <div className="invest-form-linha"><Alerta>{erros.geral}</Alerta></div> : null}
      <div className="invest-form-linha invest-form-botoes">
        <Botao type="submit">Cadastrar ativo</Botao>
        <Botao variante="secundario" onClick={onCancelar}>Cancelar</Botao>
      </div>
    </form>
  );
}
