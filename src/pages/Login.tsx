import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { auth } from '@/config/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';

export default function Login() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();
  const { user, isLoading } = useAuthStore();

  // Si el usuario ya está autenticado, lo mandamos al dashboard
  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      
      toast.success('¡Sesión iniciada con éxito!');
      navigate('/');
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      toast.error('Ocurrió un error al intentar iniciar sesión con Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white/60 p-8 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
        
        {/* Logo / Header */}
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20">
            <img src="/logo-svg.svg" alt="FundedFlow" className="size-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Funded<span className="text-indigo-500">Flow</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Tu bitácora profesional de trading y control de riesgo para cuentas fondeadas.
          </p>
        </div>

        {/* Login actions */}
        <div className="space-y-4">
          <Button
            size="lg"
            variant="outline"
            className="w-full relative group overflow-hidden border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 h-14"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <Loader2 className="mr-2 size-5 animate-spin" />
            ) : (
              <svg className="mr-2 size-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Continuar con Google
            </span>
          </Button>
        </div>
        
        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Al continuar, aceptas nuestros términos de servicio y política de privacidad.
          </p>
        </div>
      </div>
    </div>
  );
}
