import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDayKey } from '@/lib/riskGuardian';

/** Estado de sesión por cuenta (efímero, atado al día local). */
interface AccountSession {
  dayKey: string;
  cooldownUntil: number | null;   // epoch ms
  deRiskFactor: number;           // 1 = normal, 0.5 = riesgo reducido
  manualLockout: boolean;         // día bloqueado manualmente
  lastHandledStreak: number;      // última racha ya atendida en el Tilt Guard
}

interface RiskGuardianState {
  sessions: Record<string, AccountSession>;
  getSession: (accountId: string) => AccountSession;
  startCooldown: (accountId: string, minutes: number) => void;
  setDeRisk: (accountId: string, factor: number) => void;
  setLockout: (accountId: string, locked: boolean) => void;
  markStreakHandled: (accountId: string, streak: number) => void;
  resetSession: (accountId: string) => void;
}

function freshSession(): AccountSession {
  return {
    dayKey: getDayKey(new Date()),
    cooldownUntil: null,
    deRiskFactor: 1,
    manualLockout: false,
    lastHandledStreak: 0,
  };
}

/** Devuelve la sesión vigente; si el día cambió, la resetea automáticamente. */
function ensureToday(sessions: Record<string, AccountSession>, accountId: string): AccountSession {
  const today = getDayKey(new Date());
  const existing = sessions[accountId];
  if (!existing || existing.dayKey !== today) {
    return freshSession();
  }
  return existing;
}

export const useRiskGuardianStore = create<RiskGuardianState>()(
  persist(
    (set, get) => ({
      sessions: {},

      // Puro: normaliza al día actual sin mutar el estado (seguro en render).
      // Las acciones (startCooldown, etc.) persisten los cambios vía ensureToday.
      getSession: (accountId) => ensureToday(get().sessions, accountId),

      startCooldown: (accountId, minutes) =>
        set((state) => {
          const base = ensureToday(state.sessions, accountId);
          return {
            sessions: {
              ...state.sessions,
              [accountId]: { ...base, cooldownUntil: Date.now() + minutes * 60_000 },
            },
          };
        }),

      setDeRisk: (accountId, factor) =>
        set((state) => {
          const base = ensureToday(state.sessions, accountId);
          return {
            sessions: { ...state.sessions, [accountId]: { ...base, deRiskFactor: factor } },
          };
        }),

      setLockout: (accountId, locked) =>
        set((state) => {
          const base = ensureToday(state.sessions, accountId);
          return {
            sessions: { ...state.sessions, [accountId]: { ...base, manualLockout: locked } },
          };
        }),

      markStreakHandled: (accountId, streak) =>
        set((state) => {
          const base = ensureToday(state.sessions, accountId);
          return {
            sessions: { ...state.sessions, [accountId]: { ...base, lastHandledStreak: streak } },
          };
        }),

      resetSession: (accountId) =>
        set((state) => ({
          sessions: { ...state.sessions, [accountId]: freshSession() },
        })),
    }),
    {
      name: 'risk-guardian-storage',
    }
  )
);
