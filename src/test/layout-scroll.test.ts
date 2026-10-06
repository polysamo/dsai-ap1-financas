import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, '..', 'components', 'Layout.css'), 'utf-8');

describe('BUG-008: scroll do layout fica preso na área de conteúdo, não no documento', () => {
  it('em telas largas, .layout-raiz trava a altura em 100dvh (não min-height) para o body não rolar', () => {
    expect(css).toMatch(/\.layout-raiz\s*\{[^}]*height:\s*100dvh/);
    expect(css).not.toMatch(/\.layout-raiz\s*\{[^}]*min-height:\s*100vh/);
  });

  it('.layout-principal rola por dentro (overflow-y: auto) em vez de esticar a página', () => {
    expect(css).toMatch(/\.layout-principal\s*\{[^}]*overflow-y:\s*auto/);
  });

  it('no celular (≤47.99rem), a página volta a rolar inteira (sidebar não existe nesse modo)', () => {
    const mediaCelular = css.match(/@media \(max-width: 47\.99rem\) \{([\s\S]*)\}\s*$/)?.[1] ?? '';
    expect(mediaCelular).toMatch(/\.layout-raiz\s*\{[^}]*height:\s*auto/);
  });
});
