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
import { ServicesPage } from './pages/ServicesPage';
import { MapPage } from './pages/MapPage';
import { DevicesPendingPage } from './pages/DevicesPendingPage';
import { AlertsPage } from './pages/AlertsPage';
import { CoordinationActionsPage } from './pages/CoordinationActionsPage';

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
          <Route path="alertas" element={<AlertsPage />} />
          <Route path="acciones" element={<CoordinationActionsPage />} />
          <Route path="servicios" element={<ServicesPage />} />
          <Route path="servicio/:id" element={<ServiceDetailPage />} />
          {/* Domicilios se gestionan dentro de Personas a cuidar. */}
          <Route
            path="r/patient-addresses"
            element={<Navigate to="/r/patients" replace />}
          />
          {/* Servicios y Asignaciones viven en la pantalla /servicios. */}
          <Route
            path="r/services"
            element={<Navigate to="/servicios" replace />}
          />
          <Route
            path="r/assignments"
            element={<Navigate to="/servicios" replace />}
          />
          {/* Alertas operativas tienen su pantalla de triage propia. */}
          <Route
            path="r/alerts"
            element={<Navigate to="/alertas" replace />}
          />
          {/* Acciones de coordinación viven en su bitácora propia. */}
          <Route
            path="r/actions"
            element={<Navigate to="/acciones" replace />}
          />
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
