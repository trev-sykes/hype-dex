import { useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useCoinStore } from '../store/coinStore';
import { useBalanceStore } from "../store/balancesStore"
import { ERC6909ABI, ERC6909Address } from '../services/ERC6909Metadata';

export const useUserTokenBalance = () => {
    const { coin } = useCoinStore();
    const { address } = useAccount();
    const setBalance = useBalanceStore((s) => s.setBalance);
    const getBalance = useBalanceStore((s) => s.getBalance);

    const decimals = 0; // Adjust as needed or read from metadata

    const {
        data,
        isLoading,
        isError,
        refetch,
    } = useReadContract({
        address: ERC6909Address,
        abi: ERC6909ABI,
        functionName: 'balanceOf',
        args: address && coin?.tokenId ? [address, coin.tokenId] : undefined,
    });

    // Update store whenever data or coin changes
    useEffect(() => {
        if (data && coin?.tokenId) {
            setBalance(
                coin.tokenId.toString(),
                data as bigint,
                decimals,
                coin.price
            );
        }
    }, [data, coin?.tokenId, coin?.price]);

    // Pull live data from the store
    const stored = coin?.tokenId ? getBalance(coin.tokenId.toString()) : undefined;

    return {
        tokenBalance: stored?.balance,
        balanceEth: stored?.formatted ?? 0,
        totalValueEth: stored?.totalValueEth,
        isLoading,
        isError,
        refetchBalance: refetch,
    };
};
