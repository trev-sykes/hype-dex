import { useReadContract } from "wagmi";
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from "../services/ETHBackedTokenMinter";
import { ERC6909ABI, ERC6909Address } from "../services/ERC6909Metadata";
import { useCoinStore } from "../store/coinStore";
import { useEffect, useCallback } from "react";

export const useTokenData = () => {
    const { coin, setCoin } = useCoinStore();
    const tokenId = coin?.tokenId;
    const {
        data: price,
        refetch: refetchPrice,
        isLoading: isLoadingPrice,
        isError: isErrorPrice,
    } = useReadContract({
        address: ETHBackedTokenMinterAddress,
        abi: ETHBackedTokenMinterABI,
        functionName: 'getPrice',
        args: [tokenId],
    });

    const {
        data: reserve,
        refetch: refetchReserve,
        isLoading: isLoadingReserve,
        isError: isErrorReserve,
    } = useReadContract({
        address: ETHBackedTokenMinterAddress,
        abi: ETHBackedTokenMinterABI,
        functionName: 'getReserve',
        args: [tokenId],
    });

    const {
        data: totalSupply,
        refetch: refetchSupply,
        isLoading: isLoadingSupply,
        isError: isErrorSupply,
    } = useReadContract({
        address: ERC6909Address,
        abi: ERC6909ABI,
        functionName: 'totalSupply',
        args: [tokenId],
    });

    // Update the store when any of the values change
    useEffect(() => {
        if (coin && (price || reserve || totalSupply)) {
            setCoin({
                ...coin,
                price: price ?? coin.price,
                reserve: reserve ?? coin.reserve,
                totalSupply: totalSupply ?? coin.totalSupply,
            });
        }
    }, [price, reserve, totalSupply]);

    // Unified refetch function
    const refetchAll = useCallback(() => {
        refetchPrice?.();
        refetchReserve?.();
        refetchSupply?.();
    }, [refetchPrice, refetchReserve, refetchSupply]);

    return {
        price,
        reserve,
        totalSupply,
        isLoading: isLoadingPrice || isLoadingReserve || isLoadingSupply,
        isError: isErrorPrice || isErrorReserve || isErrorSupply,
        refetchAll,
    };
};
