import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
    chains: [sepolia],
    connectors: [
        injected(),
        walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
    ],
    transports: {
        [sepolia.id]: http(),
    },

})

declare module 'wagmi' {
    interface Register {
        config: typeof config
    }
}
