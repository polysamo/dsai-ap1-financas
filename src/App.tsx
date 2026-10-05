import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { FluxoPage } from './pages/FluxoPage';
import { FalhaCarregamento } from './components/FalhaCarregamento';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { AssinaturasPage } from './pages/AssinaturasPage';
import { CalculadorasPage } from './pages/CalculadorasPage';
import { SaudePage } from './pages/SaudePage';
import { DesejosPage } from './pages/DesejosPage';
import { EventosPage } from './pages/EventosPage';
import { BeneficiariosPage } from './pages/BeneficiariosPage';
import { AlertasPage } from './pages/AlertasPage';
import { CalendarioPage } from './pages/CalendarioPage';
import { CartoesPage } from './pages/CartoesPage';
import { ConciliacaoPage } from './pages/ConciliacaoPage';
import { ContasPage } from './pages/ContasPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { DividasPage } from './pages/DividasPage';
import { DivisaoPage } from './pages/DivisaoPage';
import { ImportarCsvPage } from './pages/ImportarCsvPage';
import { ImportarOfxPage } from './pages/ImportarOfxPage';
import { InvestimentosPage } from './pages/InvestimentosPage';
import { IndependenciaPage } from './pages/IndependenciaPage';
import { MetasPage } from './pages/MetasPage';
import { AjudaPage } from './pages/AjudaPage';
import { OrcamentoPage } from './pages/OrcamentoPage';
import { OrcamentoAnualPage } from './pages/OrcamentoAnualPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { RegrasPage } from './pages/RegrasPage';
import { TransacoesPage } from './pages/TransacoesPage';
import { TransferenciasPage } from './pages/TransferenciasPage';
import { PatrimonioPage } from './pages/PatrimonioPage';
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
        <Route path="/conciliacao" element={<ConciliacaoPage />} />
        <Route path="/cartoes" element={<CartoesPage />} />
        <Route path="/transferencias" element={<TransferenciasPage />} />
        <Route path="/assinaturas" element={<AssinaturasPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="/fluxo" element={<FluxoPage />} />
        <Route path="/saude" element={<SaudePage />} />
        <Route path="/beneficiarios" element={<BeneficiariosPage />} />
        <Route path="/alertas" element={<AlertasPage />} />
        <Route path="/orcamento" element={<OrcamentoPage />} />
        <Route path="/orcamento-anual" element={<OrcamentoAnualPage />} />
        <Route path="/metas" element={<MetasPage />} />
        <Route path="/desejos" element={<DesejosPage />} />
        <Route path="/eventos" element={<EventosPage />} />
        <Route path="/regras" element={<RegrasPage />} />
        <Route path="/investimentos" element={<InvestimentosPage />} />
        <Route path="/independencia" element={<IndependenciaPage />} />
        <Route path="/calculadoras" element={<CalculadorasPage />} />
        <Route path="/dividas" element={<DividasPage />} />
        <Route path="/divisao" element={<DivisaoPage />} />
        <Route path="/patrimonio" element={<PatrimonioPage />} />
        <Route path="/importar" element={<ImportarCsvPage />} />
        <Route path="/importar-ofx" element={<ImportarOfxPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="/dados" element={<Navigate to="/configuracoes" replace />} />
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
