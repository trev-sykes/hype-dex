import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { formatUnits } from 'viem';

interface TokenBalance {
    tokenId: any;
    balance: any;
    formatted: any;
    totalValueEth?: any;
}

interface BalanceStore {
    balances: Record<string, TokenBalance>;
    hydrated: any;
    setBalance: (
        tokenId: any,
        balance: any,
        decimals: any,
        price?: any
    ) => void;
    getBalance: (tokenId: string) => TokenBalance | undefined;
    clearBalances: () => void;
}

export const useBalanceStore = create<BalanceStore>()(
    persist(
        (set, get): BalanceStore => ({
            balances: {},
            hydrated: false,

            setBalance: (tokenId, balance, decimals, price) => {
                if (price === undefined) {
                    console.warn(`No price passed for tokenId ${tokenId}`);
                }
                const formatted = Number(formatUnits(balance, decimals));
                const priceEth = price ? Number(formatUnits(BigInt(price), 18)) : undefined;

                set((state: any) => ({
                    balances: {
                        ...state.balances,
                        [tokenId]: {
                            tokenId,
                            balance: balance.toString(),
                            formatted,
                            totalValueEth: priceEth ? formatted * priceEth : undefined,
                        },
                    },
                }));
            },


            getBalance: (tokenId) => {
                const stored = get().balances[tokenId];
                if (!stored) return undefined;
                return {
                    ...stored,
                    balance: BigInt(stored.balance), // Convert back to BigInt
                };
            },

            clearBalances: () => set({ balances: {} }),
        }),
        {
            name: 'user-balances-storage',
            version: 1,
            onRehydrateStorage: () => (state: any) => {
                state.hydrated = true;
                console.log('[Balance Store] Rehydrated', state);
            },
        }
    )
);
