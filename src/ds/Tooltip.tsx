import { cloneElement, useEffect, useId, useState, type ReactElement } from 'react';
import './Tooltip.css';

interface Props {
  texto: string;
  /** Um único elemento focável; recebe `aria-describedby` enquanto a dica está visível. */
  children: ReactElement<{ 'aria-describedby'?: string }>;
}

/** Dica curta que aparece no hover e no foco, some com Esc e é lida pelo leitor de tela. */
export function Tooltip({ texto, children }: Props) {
  const id = useId();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setVisivel(false);
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [visivel]);

  return (
    <span className="ds-dica" onMouseEnter={() => setVisivel(true)} onMouseLeave={() => setVisivel(false)} onFocusCapture={() => setVisivel(true)} onBlurCapture={() => setVisivel(false)}>
      {cloneElement(children, visivel ? { 'aria-describedby': id } : {})}
      {visivel ? (
        <span id={id} role="tooltip" className="ds-dica__balao">
          {texto}
        </span>
      ) : null}
    </span>
  );
}
