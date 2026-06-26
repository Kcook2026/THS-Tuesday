import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ConfirmProvider } from '@/components/shared/ConfirmDialog';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import MyWork from '@/pages/MyWork';
import Members from '@/pages/Members';
import ExecutiveDashboard from '@/pages/ExecutiveDashboard';
import WorkspaceSettings from '@/pages/WorkspaceSettings';
import Workboards from '@/pages/Workboards';
import WorkboardDetail from '@/pages/WorkboardDetail';
import Teams from '@/pages/Teams';
import ActivityFeed from '@/pages/ActivityFeed';
import Notifications from '@/pages/Notifications';
import Processes from '@/pages/Processes';
import ProcessDetail from '@/pages/ProcessDetail';
import Projects from '@/pages/Projects';
import TaskBoard from '@/pages/TaskBoard';
import TaskTable from '@/pages/TaskTable';
import Calendar from '@/pages/Calendar';
import Documents from '@/pages/Documents';
import Portfolios from '@/pages/Portfolios';
import PortfolioDetail from '@/pages/PortfolioDetail';
import Goals from '@/pages/Goals';
import PermissionDebug from '@/pages/PermissionDebug';
import WorkboardQA from '@/pages/WorkboardQA';
import WorkboardUpdates from '@/pages/WorkboardUpdates';
import FormBuilder from '@/pages/FormBuilder';
import FormSubmit from '@/pages/FormSubmit';
import FormsLibrary from '@/pages/FormsLibrary';
import ArchivedForms from '@/pages/ArchivedForms';
import FormSubmissionsPage from '@/pages/FormSubmissionsPage';
import AutomationCenter from '@/pages/AutomationCenter';
import AutomationBuilder from '@/pages/AutomationBuilder';

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
          {/* Primary */}
          <Route path="/" element={<Home />} />
          <Route path="/my-work" element={<MyWork />} />
          <Route path="/workboards" element={<Workboards />} />
          <Route path="/workboards/:id" element={<WorkboardDetail />} />
          <Route path="/activity" element={<ActivityFeed />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/notifications" element={<Notifications />} />
          {/* Executive */}
          <Route path="/executive" element={<ExecutiveDashboard />} />
          {/* Administration */}
          <Route path="/members" element={<Members />} />
          <Route path="/workspace-settings" element={<WorkspaceSettings />} />
          {/* Workboard Views (Projects, Tasks, Calendar surface through workboards) */}
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks/board" element={<TaskBoard />} />
          <Route path="/tasks/table" element={<TaskTable />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/documents" element={<Documents />} />
          {/* SOPs */}
          <Route path="/processes" element={<Processes />} />
          <Route path="/processes/:id" element={<ProcessDetail />} />
          {/* Portfolio & Goals */}
          <Route path="/portfolios" element={<Portfolios />} />
          <Route path="/portfolios/:id" element={<PortfolioDetail />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/permission-debug" element={<PermissionDebug />} />
          <Route path="/workboard-qa" element={<WorkboardQA />} />
          <Route path="/workboards/:id/updates" element={<WorkboardUpdates />} />
          <Route path="/forms" element={<FormsLibrary />} />
          <Route path="/forms/archived" element={<ArchivedForms />} />
          <Route path="/forms/:formId/builder" element={<FormBuilder />} />
          <Route path="/forms/:formId/submit" element={<FormSubmit />} />
          <Route path="/forms/:formId/submissions" element={<FormSubmissionsPage />} />
          <Route path="/automations" element={<AutomationCenter />} />
          <Route path="/automations/builder" element={<AutomationBuilder />} />
          <Route path="/automations/:ruleId/edit" element={<AutomationBuilder />} />
        </Route>
      </Route>
      {/* Backwards compatibility redirect */}
      <Route path="/users-access" element={<Navigate to="/members" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ConfirmProvider>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        </ConfirmProvider>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App