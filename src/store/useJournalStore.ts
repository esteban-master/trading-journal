import { create } from 'zustand';
import { Account, Trade } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface JournalState {
  accounts: Account[];
  trades: Trade[];
  
  // Account Actions
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  // Trade Actions
  addTrade: (trade: Omit<Trade, 'id' | 'date'>) => void;
  updateTrade: (id: string, trade: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
}

// Initial mock data to help with UI building
const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    name: 'Topstep 50k #1',
    firm: 'Topstep',
    status: 'Funded',
    cost: 49,
    startingBalance: 50000,
    currentBalance: 51200,
    equity: 51200,
    totalWithdrawals: 0,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'acc-2',
    name: 'Topstep 50k #2',
    firm: 'Topstep',
    status: 'Evaluation',
    cost: 49,
    startingBalance: 50000,
    currentBalance: 49800,
    equity: 49800,
    totalWithdrawals: 0,
    createdAt: new Date().toISOString(),
  }
];

const MOCK_TRADES: Trade[] = [
  {
    id: 'trd-1',
    accountId: 'acc-1',
    asset: 'NQ',
    direction: 'Long',
    entryPrice: 18500,
    exitPrice: 18550,
    pnl: 1000,
    strategy: 'Breakout',
    riskRewardRatio: 2.5,
    images: [],
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'Closed'
  },
  {
    id: 'trd-2',
    accountId: 'acc-2',
    asset: 'ES',
    direction: 'Short',
    entryPrice: 5300,
    exitPrice: 5310,
    pnl: -500,
    strategy: 'Reversal',
    riskRewardRatio: 1,
    images: [],
    date: new Date().toISOString(),
    status: 'Closed'
  }
];

export const useJournalStore = create<JournalState>((set) => ({
  accounts: MOCK_ACCOUNTS,
  trades: MOCK_TRADES,

  addAccount: (acc) => set((state) => ({
    accounts: [...state.accounts, { ...acc, id: uuidv4(), createdAt: new Date().toISOString() }]
  })),
  
  updateAccount: (id, updatedFields) => set((state) => ({
    accounts: state.accounts.map(acc => acc.id === id ? { ...acc, ...updatedFields } : acc)
  })),
  
  deleteAccount: (id) => set((state) => ({
    accounts: state.accounts.filter(acc => acc.id !== id),
    // Also delete associated trades? For now, keep simple.
  })),

  addTrade: (trade) => set((state) => {
    const newTrade: Trade = { ...trade, id: uuidv4(), date: new Date().toISOString() };
    
    // Auto-update account balance based on PnL
    const accounts = state.accounts.map(acc => {
      if (acc.id === trade.accountId) {
        return {
          ...acc,
          currentBalance: acc.currentBalance + trade.pnl,
          equity: acc.equity + trade.pnl
        };
      }
      return acc;
    });

    return { trades: [...state.trades, newTrade], accounts };
  }),

  updateTrade: (id, updatedFields) => set((state) => {
    // Note: A full implementation would recalculate the account balance difference if PnL changes.
    return {
      trades: state.trades.map(t => t.id === id ? { ...t, ...updatedFields } : t)
    };
  }),

  deleteTrade: (id) => set((state) => ({
    trades: state.trades.filter(t => t.id !== id)
  }))
}));
