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

            setTokens: (tokens: any) => {
                console.log('Setting tokens:', tokens);
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
                    console.log('Updated tokens:', updatedTokens);
                    return { tokens: updatedTokens };
                });
            },

            clearTokens: () => set({ tokens: [] }),
        }),
        {
            name: 'token-storage',
            onRehydrateStorage: () => (state: any) => {
                console.log('[Store] Rehydrated state:', state);
                // ✅ Explicitly mark the store as hydrated
                state.hydrated = true;
            },

        }
    )
);
