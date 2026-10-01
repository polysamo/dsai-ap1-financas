import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { FalhaCarregamento } from './components/FalhaCarregamento';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarioPage } from './pages/CalendarioPage';
import { CartoesPage } from './pages/CartoesPage';
import { ContasPage } from './pages/ContasPage';
import { DadosPage } from './pages/DadosPage';
import { DividasPage } from './pages/DividasPage';
import { ImportarCsvPage } from './pages/ImportarCsvPage';
import { InvestimentosPage } from './pages/InvestimentosPage';
import { MetasPage } from './pages/MetasPage';
import { AjudaPage } from './pages/AjudaPage';
import { OrcamentoPage } from './pages/OrcamentoPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { RegrasPage } from './pages/RegrasPage';
import { TransacoesPage } from './pages/TransacoesPage';
import { useSnapshot } from './state/store';

/** Rotas do app; separadas do roteador para poderem ser testadas com MemoryRouter. */
export function AppRoutes() {
  const { problema } = useSnapshot();
  if (problema) return <FalhaCarregamento problema={problema} />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/transacoes" element={<TransacoesPage />} />
        <Route path="/contas" element={<ContasPage />} />
        <Route path="/cartoes" element={<CartoesPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="/orcamento" element={<OrcamentoPage />} />
        <Route path="/metas" element={<MetasPage />} />
        <Route path="/regras" element={<RegrasPage />} />
        <Route path="/investimentos" element={<InvestimentosPage />} />
        <Route path="/dividas" element={<DividasPage />} />
        <Route path="/importar" element={<ImportarCsvPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/dados" element={<DadosPage />} />
        <Route path="/ajuda" element={<AjudaPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
