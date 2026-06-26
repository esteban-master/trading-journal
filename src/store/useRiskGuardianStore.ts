import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDayKey } from '@/lib/riskGuardian';

/** Estado de sesión por cuenta (efímero, atado al día local). */
interface AccountSession {
  dayKey: string;
  cooldownUntil: number | null;   // epoch ms
  deRiskFactor: number;           // 1 = normal, 0.5 = riesgo reducido
  lockoutUntil: number | null;    // epoch ms — null = sin bloqueo
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
    lockoutUntil: null,
    lastHandledStreak: 0,
  };
}

/** Epoch ms del día siguiente a las 8:00 AM (inicio de jornada de trading). */
function nextDayAt8am(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d.getTime();
}

/** Devuelve la sesión vigente; si el día cambió, resetea pero preserva un lockout activo. */
function ensureToday(sessions: Record<string, AccountSession>, accountId: string): AccountSession {
  const today = getDayKey(new Date());
  const raw = sessions[accountId] as (AccountSession & { manualLockout?: boolean }) | undefined;

  if (!raw) return freshSession();

  // Migración: sesiones antiguas con manualLockout boolean, solo si son del día de hoy
  let existing: AccountSession = raw.lockoutUntil !== undefined
    ? raw
    : { ...raw, lockoutUntil: (raw.manualLockout === true && raw.dayKey === today) ? nextDayAt8am() : null };

  if (existing.dayKey === today) return existing;

  // El día cambió: sesión fresca, pero preserva el lockout si aún no venció
  const fresh = freshSession();
  if (existing.lockoutUntil !== null && Date.now() < existing.lockoutUntil) {
    return { ...fresh, lockoutUntil: existing.lockoutUntil };
  }
  return fresh;
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
            sessions: { ...state.sessions, [accountId]: { ...base, lockoutUntil: locked ? nextDayAt8am() : null } },
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
