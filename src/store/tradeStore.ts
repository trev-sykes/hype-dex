import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Trade {
    tokenId: bigint;
    amount: bigint;
    cost: bigint;
    price: number;
    timestamp: number;
    type: 'mint' | 'burn';
}

type TradeMap = Record<string, Trade[]>;

interface TradeStore {
    trades: TradeMap;
    setTrades: (key: string, trades: Trade[]) => void;
    appendTrade: (key: string, trade: Trade) => void;
}

export const useTradeStore = create<TradeStore>()(
    persist(
        (set, get) => ({
            trades: {},
            setTrades: (key, trades) =>
                set((state) => ({
                    trades: { ...state.trades, [key]: trades },
                })),
            appendTrade: (key, trade) => {
                const existing = get().trades[key] || [];
                const updated = [...existing, trade].sort((a, b) => a.timestamp - b.timestamp);
                set({
                    trades: { ...get().trades, [key]: updated },
                });
            },
        }),
        {
            name: 'trade-store',
            partialize: (state) => ({ trades: state.trades }),
            onRehydrateStorage: () => () => {
                console.log('[Zustand] Trades store rehydrated');
            },
        }
    )
);

