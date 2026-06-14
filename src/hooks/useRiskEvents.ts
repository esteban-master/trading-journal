import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RiskEvent } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { getRiskEvents, logRiskEvent, RiskEventInput } from '@/lib/riskGuardianService';

// 1. Listar eventos de riesgo de una cuenta
export function useRiskEvents(accountId?: string) {
  const { user } = useAuthStore();

  return useQuery<RiskEvent[]>({
    queryKey: ['risk_events', accountId, user?.uid],
    queryFn: async () => {
      if (!user?.uid || !accountId) return [];
      try {
        return await getRiskEvents(user.uid, accountId);
      } catch (error) {
        console.error('Error fetching risk events:', error);
        return [];
      }
    },
    enabled: !!user?.uid && !!accountId,
    staleTime: 1000 * 60 * 5,
  });
}

// 2. Registrar un evento de riesgo (tilt, cooldown, de-risk, lockout, override)
export function useLogRiskEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (event: Omit<RiskEventInput, 'userId'>) => {
      if (!user?.uid) throw new Error('Unauthenticated');
      return logRiskEvent({ ...event, userId: user.uid });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['risk_events', variables.accountId] });
    },
  });
}
