import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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



export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <CompanyAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
          <Route path="/dashboard/rules" element={<ProtectedRoute><CommissionRules /></ProtectedRoute>} />
          <Route path="/dashboard/import" element={<ProtectedRoute><ImportBookings /></ProtectedRoute>} />
          <Route path="/statement" element={<ProtectedRoute><AgentStatement /></ProtectedRoute>} />
          <Route path="/dashboard/payouts" element={<ProtectedRoute><PayoutsRun /></ProtectedRoute>} />
          <Route path="/dashboard/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />



<Route
  path="/finance"
  element={
    <ProtectedRoute>
      <FinanceDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/agent"
  element={
    <ProtectedRoute>
      <AgentDashboard />
    </ProtectedRoute>
  }
/>

          <Route
  path="/dashboard/users"
  element={
    <ProtectedRoute>
      <UsersPage />
    </ProtectedRoute>
  }
/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}