import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Token } from '../types/token';

interface TokenStore {
    tokens: Token[];
    hydrated: boolean;
    setTokens: (tokens: Token[]) => void;
    addToken: (token: Token) => void;
    updateToken: (tokenId: string, newData: Partial<Token>) => void;
    clearTokens: () => void;
    getLatestTimestamp: () => number;
    getTokenById: (tokenId: string) => Token | undefined;
    appendToken: (token: Token) => void;
}

export const useTokenStore = create<TokenStore>()(
    persist(
        (set, get): TokenStore => ({
            tokens: [],
            hydrated: false,

            setTokens: (tokens: any) => {
                console.log('[Token Store] Setting tokens:', tokens);
                set({ tokens })
            },
            addToken: (token: any) =>
                set((state: any) => ({
                    tokens: [...state.tokens, token],
                })),
            updateToken: (tokenId: any, newData: any) => {
                set((state: any) => {
                    const updatedTokens = state.tokens.map((t: any) =>
                        t.tokenId.toString() === tokenId.toString() ? { ...t, ...newData } : t
                    );
                    console.log('[Token Store] Updated tokens:', updatedTokens);
                    return { tokens: updatedTokens };
                });
            },

            clearTokens: () => set({ tokens: [] }),
            // NEW method: get max blockTimestamp from tokens
            getLatestTimestamp: () => {
                const tokens = get().tokens;
                if (tokens.length === 0) return 0;
                return Math.max(...tokens.map((t: any) => t.blockTimestamp ?? 0));
            },
            getTokenById: (tokenId: string) => {
                const tokens = get().tokens;
                return tokens.find((t: any) => t.tokenId.toString() === tokenId.toString());
            },
            appendToken: (token: Token) => {
                const tokens = get().tokens;
                const existing = tokens.find((t: any) => t.tokenId.toString() === token.tokenId.toString());
                const exists = tokens.find((t: any) => t.tokenId.toString() === token.tokenId.toString());
                if (!exists) {
                    set({ tokens: [...tokens, token] });
                    console.log(`[Token Store] Appended tokenId ${token.tokenId}`);
                } else {
                    // Optional: merge with new data if needed
                    const merged = { ...existing, ...token };
                    set({
                        tokens: tokens.map((t: any) =>
                            t.tokenId.toString() === token.tokenId.toString() ? merged : t
                        ),
                    });
                    console.log(`[Token Store] Merged update for tokenId ${token.tokenId}`);
                }
            },
        }),
        {
            name: 'token-storage',
            onRehydrateStorage: () => (state: any) => {
                state.hydrated = true;
            },

        }
    )
);
