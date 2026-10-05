import { useLocation, useNavigate } from 'react-router-dom';
import { EmptyState } from '../ds/EmptyState';
import { Button } from '../ds/Button';
import { TituloPagina } from '../components/ui';

/** Página 404: mostra o caminho digitado e leva ao Dashboard ou à busca. */
export function NaoEncontradaPage({ aoBuscar }: { aoBuscar?: () => void }) {
  const { pathname } = useLocation();
  const navegar = useNavigate();
  return (
    <div>
      <TituloPagina>Página não encontrada</TituloPagina>
      <EmptyState
        titulo="Não encontramos essa página"
        acao={
          <>
            <Button onClick={() => navegar('/')}>Ir para o Dashboard</Button>{' '}
            {aoBuscar ? (
              <Button variante="secundario" onClick={aoBuscar}>
                Buscar
              </Button>
            ) : null}
          </>
        }
      >
        O endereço <code>{pathname}</code> não existe. Confira o link ou procure a tela pelo nome.
      </EmptyState>
    </div>
  );
}
