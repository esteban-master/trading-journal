import { Loader2 } from 'lucide-react';
import { Suspense, lazy } from 'react';
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from 'react-router';

import Dashboard from './pages/Dashboard';
import DashboardLayout from './DashboardLayout';

import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const AccountsList = lazy(() => import('@/pages/Accounts/AccountsList'));
const AccountDetail = lazy(() => import('@/pages/Accounts/AccountDetail'));
const Notes = lazy(() => import('@/pages/Notes'));
const SourceDetail = lazy(() => import('@/pages/Notes/SourceDetail'));
const TopstepSim = lazy(() => import('@/pages/TopstepSim'));
const CyclesList = lazy(() => import('@/pages/Cycles/CyclesList'));
const CycleDetail = lazy(() => import('@/pages/Cycles/CycleDetail'));
// const TradingCalendar = lazy(() => import('@/pages/Calendar/TradingCalendar'));
// const RiskManager = lazy(() => import('@/components/risk/RiskManager'));
const Login = lazy(() => import('@/pages/Login'));

const RouteLoader = () => (
  <div className="flex h-[calc(100vh-60px)] items-center justify-center">
    <Loader2 className="size-6 animate-spin text-indigo-500" />
  </div>
);

function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardLayout />} >
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<AccountsList />} />
              <Route path="/accounts/:id" element={<AccountDetail />} />
              <Route path="/apuntes" element={<Notes />} />
              <Route path="/apuntes/fuentes/:id" element={<SourceDetail />} />
              <Route path="/topstep" element={<TopstepSim />} />
              <Route path="/ciclos" element={<CyclesList />} />
              <Route path="/ciclos/:id" element={<CycleDetail />} />
              {/* <Route path="/calendar" element={<TradingCalendar />} />
              <Route path="/risk" element={<RiskManager />} /> */}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function AppRouter() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  );
}

export default AppRouter;
