import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../../ds/ErrorState';

interface Props {
  children: ReactNode;
}

interface Estado {
  erro: Error | null;
}

/** Captura exceções de renderização de uma rota para o menu e o cabeçalho continuarem funcionando. */
export class LimiteDeErro extends Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Falha ao desenhar a tela:', erro, info.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <ErrorState titulo="Esta tela falhou" aoTentarNovamente={() => this.setState({ erro: null })}>
        Algo inesperado aconteceu ao mostrar esta tela. Seus dados continuam salvos. Tente de novo ou volte ao Dashboard.
      </ErrorState>
    );
  }
}
