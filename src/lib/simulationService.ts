import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface SimulationRunPayload {
  userId?: string; // Optional for now, until Auth is fully integrated
  inputs: {
    winRate: number;
    riskRewardRatio: number;
    numberOfTrades: number;
    iterations: number;
    commissionPerTrade: number;
    startingBalance: number;
  };
  riskConfig: {
    baseRiskPercent: number;
    lossMultiplier: number;
    maxRiskPercent: number;
    enableEquityScaling: boolean;
  };
  results: {
    medianBalance: number;
    ruinProbability: number;
    maxDrawdown: number;
    kelly: number;
    maxConsecutiveWinsMedian: number;
    maxConsecutiveLossesMedian: number;
  };
}

export async function saveSimulationRun(payload: SimulationRunPayload) {
  try {
    const simulationRunsRef = collection(db, 'simulation_runs');

    const docRef = await addDoc(simulationRunsRef, {
      ...payload,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error saving simulation run: ", error);
    throw error;
  }
}

export async function getOptimizedRiskSettings(winRate: number, riskRewardRatio: number) {
  try {
    const simulationRunsRef = collection(db, 'simulation_runs');
    // Using simple query for equality. Complex sorting will be done in-memory to avoid needing composite indexes right away.
    const q = query(
      simulationRunsRef, 
      where('inputs.winRate', '==', winRate),
      where('inputs.riskRewardRatio', '==', riskRewardRatio)
    );
    
    const querySnapshot = await getDocs(q);
    const results: SimulationRunPayload[] = [];
    
    querySnapshot.forEach((doc) => {
      results.push(doc.data() as SimulationRunPayload);
    });

    // Filtramos los que tienen ruina aceptable (<= 2%)
    const safeRuns = results.filter(run => run.results.ruinProbability <= 2);

    // Ordenamos por la mayor ganancia PORCENTUAL. 
    // Esto es vital porque una cuenta de $100,000 siempre tendrá un medianBalance mayor que una de $10,000, 
    // pero lo que nos importa es qué configuración rindió mejor en porcentaje.
    safeRuns.sort((a, b) => {
      const profitPercentA = (a.results.medianBalance - a.inputs.startingBalance) / a.inputs.startingBalance;
      const profitPercentB = (b.results.medianBalance - b.inputs.startingBalance) / b.inputs.startingBalance;
      return profitPercentB - profitPercentA;
    });

    // Removemos duplicados de configuracion exacta (por si guardo lo mismo varias veces)
    const uniqueConfigs = new Map<string, SimulationRunPayload>();
    for (const run of safeRuns) {
      const configKey = `${run.riskConfig.baseRiskPercent}-${run.riskConfig.lossMultiplier}-${run.riskConfig.maxRiskPercent}-${run.riskConfig.enableEquityScaling}`;
      if (!uniqueConfigs.has(configKey)) {
        uniqueConfigs.set(configKey, run);
      }
    }

    return Array.from(uniqueConfigs.values()).slice(0, 3);
  } catch (error) {
    console.error("Error fetching optimized settings: ", error);
    throw error;
  }
}
