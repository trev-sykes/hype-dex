import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Type for a single coin
interface Coin {
    basePrice: number | string;
    description: string;
    imageUrl: string;
    name: string;
    price: any;
    reserve: any;
    slope: bigint | number | string;
    symbol: string;
    tokenId: string;
    totalSupply: any;
    uri: string;
}

// Zustand store type
interface CoinStore {
    coin: Coin | null;
    setCoin: (coin: Coin) => void;
    clearCoin: () => void;
}

// Helper to serialize BigInt fields to strings
const serializeCoin = (coin: Coin | null): Coin | null => {
    if (!coin) return null;
    return {
        ...coin,
        price: coin.price != null ? coin.price.toString() : "0",
        reserve: coin.reserve != null ? coin.reserve.toString() : "0",
        slope: coin.slope != null ? coin.slope.toString() : "0",
        tokenId: coin.tokenId?.toString?.() || "", // fallback if tokenId is undefined
        basePrice: coin.basePrice != null ? coin.basePrice.toString() : "0",
        totalSupply: coin.totalSupply != null ? coin.totalSupply.toString() : "0",
    };
};


// Helper to deserialize BigInt fields from strings
const deserializeCoin = (coin: Coin | null): Coin | null => {
    if (!coin) return null;
    return {
        ...coin,
        price: BigInt(coin.price),
        reserve: BigInt(coin.reserve),
        slope: BigInt(coin.slope),
        tokenId: coin.tokenId, // Already a string
        basePrice: Number(coin.basePrice),
        totalSupply: Number(coin.totalSupply),
    };
};

export const useCoinStore = create<CoinStore>()(
    persist(
        (set) => ({
            coin: null,
            setCoin: (coin) => set({ coin }),
            clearCoin: () => set({ coin: null }),
        }),
        {
            name: 'coin-storage', // Key in localStorage
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ coin: serializeCoin(state.coin) }),
            onRehydrateStorage: () => (state) => {
                if (state && state.coin) {
                    state.coin = deserializeCoin(state.coin);
                }
            },
        }
    )
);