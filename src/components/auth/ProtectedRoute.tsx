import { Navigate, Outlet } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export function ProtectedRoute() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirigir al usuario a la página de login si no está autenticado
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado, renderizar las rutas hijas (el DashboardLayout, por ejemplo)
  return <Outlet />;
}
