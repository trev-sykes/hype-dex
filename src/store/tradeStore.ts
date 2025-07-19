import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Trade } from '../types/trade';

type TradeMap = Record<string, Trade[]>;

interface TradeStore {
    trades: TradeMap;
    setTrades: (key: string, trades: Trade[]) => void;
    appendTrade: (key: string, trade: Trade) => void;
    getLatestTimestamp: (key: string) => number;
}

export const useTradeStore = create<TradeStore>()(
    persist(
        (set, get) => ({
            trades: {},
            setTrades: (key: number, trades: Trade[]) => {
                console.log(`[Trade Store] Setting trades for key "${key}", count: ${trades.length}`);
                set((state: any) => ({
                    trades: { ...state.trades, [key]: trades },
                }));
            },
            appendTrade: (key: number, trade: Trade) => {
                const existing = get().trades[key] || [];
                const updated = [...existing, trade].sort((a, b) => a.timestamp - b.timestamp);
                console.log(`[Trade Store] Appending trade to key "${key}". Total now: ${updated.length}`);
                set({
                    trades: { ...get().trades, [key]: updated },
                });
            },
            getLatestTimestamp: (key: number) => {
                const trades = get().trades[key] ?? [];
                return trades.length ? trades[trades.length - 1].timestamp : 0;
            }
        }),

        {
            name: 'trade-store',
            partialize: (state) => ({ trades: state.trades }),
            onRehydrateStorage: () => (state: any) => {
                console.log('[Trade Store] Rehydrated state: ', state);
                state.hydrated = true;
            },
        }
    )
);

