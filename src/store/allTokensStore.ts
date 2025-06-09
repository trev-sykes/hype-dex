import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useTokenStore = create(
    persist(
        (set) => ({
            tokens: [],
            setTokens: (tokens: any) => {
                console.log('[Store] Setting tokens:', tokens);
                set({ tokens });
            },
            addToken: (token: any) => {
                console.log('[Store] Adding token:', token);
                set((state: any) => ({ tokens: [...state.tokens, token] }));
            },
            clearTokens: () => {
                console.log('[Store] Clearing tokens');
                set({ tokens: [] });
            },
        }),
        {
            name: 'token-storage',
            onRehydrateStorage: () => (state) => {
                console.log('[Store] Rehydrated state:', state);
            },
        }
    )
);
