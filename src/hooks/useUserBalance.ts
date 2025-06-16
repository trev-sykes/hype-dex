import { useAccount, useReadContract } from 'wagmi';
import { useCoinStore } from '../store/coinStore';
import { ERC6909ABI, ERC6909Address } from '../services/ERC6909Metadata';

export const useUserTokenBalance = () => {
    const { coin } = useCoinStore();
    const { address } = useAccount();

    const {
        data,
        isLoading,
        isError,
        refetch, // ✅ expose refetch function
    } = useReadContract({
        address: ERC6909Address,
        abi: ERC6909ABI,
        functionName: 'balanceOf',
        args: [address, coin?.tokenId],

    });

    return {
        balance: data,
        isLoading,
        isError,
        refetchBalance: refetch, // ✅ expose for manual usage
    };
};
