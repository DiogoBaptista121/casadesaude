import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
import AuthPage from "./pages/Auth";
import HomePage from "./pages/Home";
import CartaoSaudePage from "./pages/CartaoSaude";
import ConsultasPage from "./pages/Consultas";
import CalendarioPage from "./pages/Calendario";
import MedicinaTrabalhoPage from "./pages/MedicinaTrabalho";
import DashboardPage from "./pages/Dashboard";
import ImportarExportarPage from "./pages/ImportarExportar";
import DefinicoesPage from "./pages/Definicoes";
import NotFound from "./pages/NotFound";
import HorariosLocaisPage from "./pages/HorariosLocais";
import AgendaUnidadeMovelPage from "./pages/AgendaUnidadeMovel";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">A carregar...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function RoleProtectedRoute({
  children,
  allowedRoles
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">A carregar...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!allowedRoles.includes(role || '')) {
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">A carregar...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/cartao-saude" element={<RoleProtectedRoute allowedRoles={['admin', 'gestor', 'colaborador']}><CartaoSaudePage /></RoleProtectedRoute>} />
      <Route path="/consultas" element={<RoleProtectedRoute allowedRoles={['admin', 'gestor', 'colaborador']}><ConsultasPage /></RoleProtectedRoute>} />
      <Route path="/calendario" element={<ProtectedRoute><CalendarioPage /></ProtectedRoute>} />
      <Route path="/horarios-locais" element={<ProtectedRoute><HorariosLocaisPage /></ProtectedRoute>} />
      <Route path="/agenda-unidade-movel" element={<ProtectedRoute><AgendaUnidadeMovelPage /></ProtectedRoute>} />
      <Route path="/medicina-trabalho" element={<RoleProtectedRoute allowedRoles={['admin']}><MedicinaTrabalhoPage /></RoleProtectedRoute>} />
      <Route path="/dashboard" element={<RoleProtectedRoute allowedRoles={['admin', 'gestor']}><DashboardPage /></RoleProtectedRoute>} />
      <Route path="/importar-exportar" element={<RoleProtectedRoute allowedRoles={['admin', 'gestor']}><ImportarExportarPage /></RoleProtectedRoute>} />
      <Route path="/definicoes" element={<ProtectedRoute><DefinicoesPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
