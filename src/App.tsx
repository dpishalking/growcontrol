import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/useAuth";
import { AppDataProvider } from "@/context/AppDataContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import DashboardPage from "@/pages/DashboardPage";
import ProjectPage from "@/pages/ProjectPage";
import FunnelWizardPage from "@/pages/FunnelWizardPage";
import FunnelOverviewPage from "@/pages/FunnelOverviewPage";
import BillingPage from "@/pages/BillingPage";
import NotFoundPage from "@/pages/NotFoundPage";
import AuthPage from "@/pages/AuthPage";
import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminProjectsPage from "@/pages/admin/AdminProjectsPage";
import AdminHypothesesPage from "@/pages/admin/AdminHypothesesPage";
import AdminUserDetailPage from "@/pages/admin/AdminUserDetailPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppDataProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<AuthPage />} />

                <Route
                  element={
                    <RequireAuth>
                      <AppLayout />
                    </RequireAuth>
                  }
                >
                  <Route
                    path="/dashboard"
                    element={
                      <ErrorBoundary fallbackTitle="Ошибка на главной">
                        <DashboardPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/projects/:projectId"
                    element={
                      <ErrorBoundary fallbackTitle="Не удалось открыть проект">
                        <ProjectPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/projects/:projectId/funnels/new/wizard/:step"
                    element={<FunnelWizardPage />}
                  />
                  <Route
                    path="/projects/:projectId/funnels/:funnelId/wizard/:step"
                    element={<FunnelWizardPage />}
                  />
                  <Route
                    path="/projects/:projectId/funnels/:funnelId"
                    element={<FunnelOverviewPage />}
                  />
                  <Route path="/billing" element={<BillingPage />} />
                </Route>

                <Route
                  element={
                    <RequireAdmin>
                      <AdminLayout />
                    </RequireAdmin>
                  }
                >
                  <Route path="/admin" element={<AdminOverviewPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
                  <Route path="/admin/projects" element={<AdminProjectsPage />} />
                  <Route path="/admin/hypotheses" element={<AdminHypothesesPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AppDataProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
