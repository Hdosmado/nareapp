import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { AppLayout } from './components/AppLayout';
import { ToastProvider } from './components/ToastProvider';
import { ThemeProvider } from './lib/theme';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { EntityListPage } from './pages/EntityListPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { MapPage } from './pages/MapPage';
import { DevicesPendingPage } from './pages/DevicesPendingPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

/** Remonta la página de listado al cambiar de entidad (resetea su estado). */
function ListRoute() {
  const { resourceKey } = useParams();
  return <EntityListPage key={resourceKey} resourceKey={resourceKey ?? ''} />;
}

function RoutedApp() {
  const { user } = useAuth();
  if (!user) return <LoginPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="agenda" element={<CalendarPage />} />
          <Route path="mapa" element={<MapPage />} />
          <Route path="dispositivos" element={<DevicesPendingPage />} />
          <Route path="servicio/:id" element={<ServiceDetailPage />} />
          <Route path="r/:resourceKey" element={<ListRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

/** Raíz de la aplicación: tema, query client, sesión y notificaciones. */
export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <RoutedApp />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
