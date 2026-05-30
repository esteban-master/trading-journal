import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    // Suscribirse a los cambios de estado de autenticación
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setLoading(false); // Ya determinamos el estado (conectado o no)
      },
      (error) => {
        console.error('Error de autenticación:', error);
        setLoading(false);
      }
    );

    // Limpiar suscripción al desmontar
    return () => unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
