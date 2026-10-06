import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..');
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

function arquivosCssETsx(dir: string): string[] {
  const resultado: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    const info = statSync(caminho);
    if (info.isDirectory()) {
      if (nome === 'test') continue;
      resultado.push(...arquivosCssETsx(caminho));
    } else if ((nome.endsWith('.css') || nome.endsWith('.tsx')) && caminho !== join(SRC, 'styles', 'tokens.css')) {
      resultado.push(caminho);
    }
  }
  return resultado;
}

describe('critério 2 (refinamento visual): cor hexadecimal só em tokens.css', () => {
  it('nenhum arquivo .css ou .tsx fora de tokens.css usa cor hexadecimal fixa', () => {
    const ofensores: string[] = [];
    for (const caminho of arquivosCssETsx(SRC)) {
      const conteudo = readFileSync(caminho, 'utf-8');
      const achados = conteudo.match(HEX_RE);
      if (achados) ofensores.push(`${caminho.replace(SRC, 'src')}: ${achados.join(', ')}`);
    }
    expect(ofensores).toEqual([]);
  });
});
