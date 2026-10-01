import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { FalhaCarregamento } from './components/FalhaCarregamento';
import { Layout } from './components/Layout';
import { DadosPage } from './pages/DadosPage';
import { useSnapshot } from './state/store';

/** Rotas do app; separadas do roteador para poderem ser testadas com MemoryRouter. */
export function AppRoutes() {
  const { problema } = useSnapshot();
  if (problema) return <FalhaCarregamento problema={problema} />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dados" replace />} />
        <Route path="/dados" element={<DadosPage />} />
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
