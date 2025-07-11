import { useAccount, useReadContract } from 'wagmi';
import { useCoinStore } from '../store/coinStore';
import { ERC6909ABI, ERC6909Address } from '../services/ERC6909Metadata';
import { formatUnits } from 'viem';

export const useUserTokenBalance = () => {
    const { coin } = useCoinStore();
    const { address } = useAccount();

    const decimals = 0; // Set default decimals or get from coin metadata

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

    const balance = data as bigint | undefined;
    const balanceEth = balance ? Number(formatUnits(balance, decimals)) : 0;
    const coinPriceEth = coin?.price ? Number(formatUnits(coin.price, 18)) : undefined; // price in ETH wei format

    const totalValueEth =
        balance && coin?.price
            ? balanceEth * coinPriceEth!
            : undefined;


    return {
        balance,
        balanceEth,
        totalValueEth,
        isLoading,
        isError,
        refetchBalance: refetch,
    };
};
