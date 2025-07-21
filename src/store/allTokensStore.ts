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

            appendToken: (token: Token) => {
                const tokens = get().tokens;
                const exists = tokens.find((t: any) => t.tokenId.toString() === token.tokenId.toString());
                if (!exists) {
                    set({ tokens: [...tokens, token] });
                    console.log(`[Token Store] Appended tokenId ${token.tokenId}`);
                } else {
                    // optionally update existing token data here
                    // For example, updateToken(token.tokenId, token)
                }
            },
        }),
        {
            name: 'token-storage',
            onRehydrateStorage: () => (state: any) => {
                console.log('[Token Store] Rehydrated state:', state);
                // ✅ Explicitly mark the store as hydrated , calling set runs into problems so direct mutation is needed
                state.hydrated = true;
            },

        }
    )
);
