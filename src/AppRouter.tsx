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

const AccountsList = lazy(() => import('@/pages/Accounts/AccountsList'));
const AccountDetail = lazy(() => import('@/pages/Accounts/AccountDetail'));
const TradingCalendar = lazy(() => import('@/pages/Calendar/TradingCalendar'));
const TradeForm = lazy(() => import('@/components/trades/TradeForm'));
const RiskManager = lazy(() => import('@/components/risk/RiskManager'));

const RouteLoader = () => (
  <div className="flex h-[calc(100vh-60px)] items-center justify-center">
    <Loader2 className="size-6 animate-spin" />
  </div>
);



function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<DashboardLayout />} >
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<AccountsList />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="/trades/new" element={<TradeForm />} />
            <Route path="/calendar" element={<TradingCalendar />} />
            <Route path="/risk" element={<RiskManager />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function AppRouter() {
  return (
    <Router>
      <AppRoutes />
      <Toaster position="top-right" />
    </Router>
  );
}

export default AppRouter;
