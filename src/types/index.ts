export type AccountStatus = 'Evaluation' | 'Funded' | 'Blown' | 'Payout' | 'Real';

export interface Account {
  id: string;
  name: string; // e.g., "Topstep 50k #1"
  firm: string; // e.g., "Topstep", "FTMO"
  status: AccountStatus;
  cost: number;
  startingBalance: number;
  currentBalance: number;
  equity: number;
  totalWithdrawals: number;
  createdAt: string; // ISO date string
  
  // Evaluation Rules
  targetProfitPercentage?: number;
  maxDrawdownPercentage?: number;
  targetProfitPercentagePhase2?: number;
  maxDrawdownPercentagePhase2?: number;
  phase?: number;
  totalPhases?: number;
}

export type TradeDirection = 'Long' | 'Short';
export type TradeStatus = 'Open' | 'Closed';

export interface Trade {
  id: string;
  accountId: string;
  asset: string; // e.g., "NQ", "ES", "EURUSD"
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number;
  pnl: number;
  strategy: string;
  riskRewardRatio: number;
  images: string[]; // Array of image URLs
  date: string; // ISO date string
  status: TradeStatus;
  phase?: number;
}

export interface Withdrawal {
  id: string;
  accountId: string;
  amount: number;
  date: string; // ISO date string
  notes?: string;
}
