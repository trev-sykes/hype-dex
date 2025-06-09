// stores/useBalances.ts
import { create } from 'zustand';

type BalancesState = {
    balances: Record<string, bigint>; // key: tokenId, value: balance
    setBalance: (tokenId: string, balance: bigint) => void;
    clearBalances: () => void;
};

export const useBalances = create<BalancesState>((set) => ({
    balances: {},
    setBalance: (tokenId, balance) =>
        set((state) => ({
            balances: {
                ...state.balances,
                [tokenId]: balance,
            },
        })),
    clearBalances: () => set({ balances: {} }),
}));
