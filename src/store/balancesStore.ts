import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { formatUnits, parseUnits } from 'viem';

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
                try {
                    const balanceBigInt =
                        typeof balance === 'bigint'
                            ? balance
                            : BigInt(balance); // Assuming `balance` is already in wei
                    const formatted = Number(formatUnits(balanceBigInt, decimals));

                    const priceBigInt =
                        price !== undefined
                            ? typeof price === 'bigint'
                                ? price
                                : parseUnits(price.toString(), 18) // ✅ Use viem here
                            : undefined;
                    const priceEth = priceBigInt
                        ? Number(formatUnits(priceBigInt, 18))
                        : undefined;
                    set((state: any) => {
                        const existing = state.balances[tokenId];
                        const isSame =
                            existing?.balance === balanceBigInt.toString() &&
                            existing?.formatted === formatted &&
                            existing?.totalValueEth === (priceEth ? formatted * priceEth : undefined);

                        if (isSame) return state; // ✅ Avoid updating if nothing changed

                        return {
                            balances: {
                                ...state.balances,
                                [tokenId]: {
                                    tokenId,
                                    balance: balanceBigInt.toString(),
                                    formatted,
                                    totalValueEth: priceEth ? formatted * priceEth : undefined,
                                },
                            },
                        };
                    });

                } catch (e) {
                    console.error(`Failed to set balance for token ${tokenId}:`, e);
                }
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
            },
        }
    )
);
