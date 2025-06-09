import { create } from 'zustand'

interface Token {
    tokenId: string
    name: string
    symbol: string
}

interface TokenStore {
    tokens: Token[]
    setTokens: (tokens: Token[]) => void
    addToken: (token: Token) => void
}

export const useTokenStore = create<TokenStore>((set: any) => ({
    tokens: [],
    setTokens: (tokens: any) => set({ tokens }),
    addToken: (token: any) => set((state: any) => ({ tokens: [...state.tokens, token] })),
}))
