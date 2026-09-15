import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import CompanyAdminDashboard from './pages/Company Admin/CompanyAdminDashboard';
import ChangePassword from './pages/ChangePassword';
import UsersPage from './pages/Company Admin/UsersPage';
import FinanceDashboard from './pages/Finance/Dashboard';
import AgentDashboard from './pages/Agent/Dashboard';
import CommissionRules from './pages/Company Admin/CommissionRules';
import ImportBookings from './pages/Company Admin/ImportBookings';
import AgentStatement from './pages/Agent/AgentStatement';
import PayoutsRun from './pages/Company Admin/Payoutsrun';
import Teams from './pages/Company Admin/Teams';





function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

   if (!user) return <Navigate to="/login" replace />;

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }return <>{children}</>;
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}



export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedPage>
                <CompanyAdminDashboard />
              </ProtectedPage>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route path="/change-password" element={<ProtectedPage><ChangePassword /></ProtectedPage>} />
          <Route path="/dashboard/rules" element={<ProtectedPage><CommissionRules /></ProtectedPage>} />
          <Route path="/dashboard/import" element={<ProtectedPage><ImportBookings /></ProtectedPage>} />
          <Route path="/statement" element={<ProtectedPage><AgentStatement /></ProtectedPage>} />
          <Route path="/dashboard/payouts" element={<ProtectedPage><PayoutsRun /></ProtectedPage>} />
          <Route path="/dashboard/teams" element={<ProtectedPage><Teams /></ProtectedPage>} />



<Route
  path="/finance"
  element={
    <ProtectedPage>
      <FinanceDashboard />
    </ProtectedPage>
  }
/>
<Route
  path="/agent"
  element={
    <ProtectedPage>
      <AgentDashboard />
    </ProtectedPage>
  }
/>

          <Route
  path="/dashboard/users"
  element={
    <ProtectedPage>
      <UsersPage />
    </ProtectedPage>
  }
/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}