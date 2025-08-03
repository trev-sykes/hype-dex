import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deepEqual } from 'wagmi';
import type { Trade } from '../types/trade';
import { useTokenStore } from './allTokensStore';

type TradeMap = Record<string, Trade[]>;

interface TradeStore {
    hydrated: any;
    trades: TradeMap;
    clearTrades: () => void;
    setTrades: (key: string, trades: Trade[]) => void;
    appendTrade: (key: string, trade: Trade) => void;
    getLatestTimestamp: (key: string) => number;
    subscribeToNewTrades: (callback: (trade: Trade) => void) => () => void;
}

let tradeListeners: ((trade: Trade) => void)[] = [];

export const useTradeStore = create<TradeStore>()(
    persist(
        (set, get) => ({
            hydrated: false,
            trades: {},
            clearTrades: () => set({ trades: {} }),
            setTrades: (key: string, trades: Trade[]) => {
                set((state: any) => {
                    if (deepEqual(state.trades[key], trades)) {
                        return state;
                    }
                    return {
                        trades: { ...state.trades, [key]: trades },
                    };
                });
            },
            appendTrade: (key: string, trade: Trade) => {
                const token = useTokenStore.getState().getTokenById(key);
                if (!token?.needsPriceUpdate) {
                    useTokenStore.getState().updateToken(key, {
                        needsPriceUpdate: true,
                    });
                }

                set((state: any) => {
                    const existing = state.trades[key] || [];
                    if (existing.some((t: any) => deepEqual(t, trade))) {
                        return state;
                    }
                    const updated = [...existing, trade].sort((a, b) => a.timestamp - b.timestamp);
                    tradeListeners.forEach(cb => cb(trade));
                    return {
                        trades: { ...state.trades, [key]: updated },
                    };
                });
            },
            getLatestTimestamp: (key: string) => {
                const trades = get().trades[key] ?? [];
                return trades.length ? trades[trades.length - 1].timestamp : 0;
            },
            subscribeToNewTrades: (callback: (trade: Trade) => void) => {
                tradeListeners.push(callback);
                return () => {
                    tradeListeners = tradeListeners.filter(cb => cb !== callback);
                };
            },
        }),
        {
            name: 'trade-store',
            partialize: (state: any) => ({ trades: state.trades }),
            onRehydrateStorage: () => (state) => {
                state.hydrated = true;
            },
        }
    )
);