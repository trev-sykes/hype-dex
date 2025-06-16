// useEnforceChain.ts
import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useSwitchChain } from 'wagmi'  // `useChainId` is from @wagmi/react-core or `useAccount.chainId`

export function useEnforceChain(requiredChainId: 11155111) {
    const { isConnected, chainId } = useAccount()
    const { chains, switchChain, error } = useSwitchChain()

    useEffect(() => {
        if (!isConnected || chainId === undefined) return

        if (chainId !== requiredChainId) {
            switchChain({ chainId: requiredChainId })
        }
    }, [isConnected, chainId, requiredChainId, switchChain])

    return {
        isCorrectChain: chainId === requiredChainId,
        error,
        availableChains: chains,
    }
}

