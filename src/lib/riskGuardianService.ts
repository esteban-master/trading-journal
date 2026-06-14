import { collection, addDoc, serverTimestamp, getDocs, query, where, Timestamp, DocumentData } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { RiskEvent } from '@/types';

const RISK_EVENTS_KEY = 'risk_events';

export type RiskEventInput = Omit<RiskEvent, 'id'>;

const normalizeRiskEvent = (docId: string, data: DocumentData): RiskEvent => ({
  id: docId,
  userId: data.userId,
  accountId: data.accountId,
  type: data.type,
  dayKey: data.dayKey,
  consecutiveLosses: data.consecutiveLosses ?? 0,
  verdict: data.verdict,
  emotionNote: data.emotionNote,
  decision: data.decision,
  date: data.date instanceof Timestamp
    ? data.date.toDate().toISOString()
    : data.date ?? new Date().toISOString(),
});

export async function logRiskEvent(payload: RiskEventInput): Promise<string> {
  const ref = collection(db, RISK_EVENTS_KEY);
  const docRef = await addDoc(ref, {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getRiskEvents(userId: string, accountId: string): Promise<RiskEvent[]> {
  const ref = collection(db, RISK_EVENTS_KEY);
  const q = query(ref, where('userId', '==', userId), where('accountId', '==', accountId));
  const snap = await getDocs(q);
  // Orden local (descendente) para evitar índices compuestos
  return snap.docs
    .map(d => normalizeRiskEvent(d.id, d.data()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
