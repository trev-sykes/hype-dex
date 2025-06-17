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
}

export const useTokenStore = create<TokenStore>()(
    persist(
        (set) => ({
            tokens: [],
            hydrated: false,

            setTokens: (tokens) => {
                console.log('Setting tokens:', tokens);
                set({ tokens })
            },
            addToken: (token) =>
                set((state) => ({
                    tokens: [...state.tokens, token],
                })),
            updateToken: (tokenId, newData) => {
                set((state) => {
                    const updatedTokens = state.tokens.map((t) =>
                        t.tokenId.toString() === tokenId.toString() ? { ...t, ...newData } : t
                    );
                    console.log('Updated tokens:', updatedTokens);
                    return { tokens: updatedTokens };
                });
            },

            clearTokens: () => set({ tokens: [] }),
        }),
        {
            name: 'token-storage',
            onRehydrateStorage: () => (state) => {
                console.log('[Store] Rehydrated state:', state);
                return { hydrated: true };  // <-- set hydrated true by returning partial state
            },
        }
    )
);
