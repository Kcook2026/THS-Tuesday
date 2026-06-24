import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import MyWork from '@/pages/MyWork';
import UsersAccess from '@/pages/UsersAccess';
import WorkspaceSettings from '@/pages/WorkspaceSettings';
import SecuritySettings from '@/pages/SecuritySettings';
import Projects from '@/pages/Projects';
import TaskBoard from '@/pages/TaskBoard';
import TaskTable from '@/pages/TaskTable';
import Calendar from '@/pages/Calendar';
import Teams from '@/pages/Teams';
import Clients from '@/pages/Clients';
import ClientDetail from '@/pages/ClientDetail';
import Documents from '@/pages/Documents';
import Reports from '@/pages/Reports';
import ActivityFeed from '@/pages/ActivityFeed';
import Workboards from '@/pages/Workboards';
import WorkboardDetail from '@/pages/WorkboardDetail';
import Processes from '@/pages/Processes';
import ProcessDetail from '@/pages/ProcessDetail';
import Notifications from '@/pages/Notifications';
import AutomationCenter from '@/pages/AutomationCenter';
import Portfolios from '@/pages/Portfolios';
import PortfolioDetail from '@/pages/PortfolioDetail';
import Goals from '@/pages/Goals';
import Resources from '@/pages/Resources';
import Timesheets from '@/pages/Timesheets';
import Finance from '@/pages/Finance';
import Roadmap from '@/pages/Roadmap';
import Risks from '@/pages/Risks';
import Templates from '@/pages/Templates';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src="https://media.base44.com/images/public/6a3c063e27549006eb32fc77/ac9acccc9_Screenshot2026-06-24at134440.png" alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/my-work" element={<MyWork />} />
          <Route path="/users-access" element={<UsersAccess />} />
          <Route path="/workspace-settings" element={<WorkspaceSettings />} />
          <Route path="/security" element={<SecuritySettings />} />
          <Route path="/workboards" element={<Workboards />} />
          <Route path="/workboards/:id" element={<WorkboardDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks/board" element={<TaskBoard />} />
          <Route path="/tasks/table" element={<TaskTable />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/processes" element={<Processes />} />
          <Route path="/processes/:id" element={<ProcessDetail />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/activity" element={<ActivityFeed />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/automations" element={<AutomationCenter />} />
          <Route path="/portfolios" element={<Portfolios />} />
          <Route path="/portfolios/:id" element={<PortfolioDetail />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/timesheets" element={<Timesheets />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/risks" element={<Risks />} />
          <Route path="/templates" element={<Templates />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App