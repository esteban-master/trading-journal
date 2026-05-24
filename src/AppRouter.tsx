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

const Page1 = lazy(() => import('@/pages/Page1'));
const Page2 = lazy(() => import('@/pages/Page2'));

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
            <Route path="/" element={<Dashboard />} />,
            <Route path="/page1" element={<Page1 />} />,
            <Route path="/page2" element={<Page2 />} />,
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
