import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchETHPrice } from '../api/fetchETHPrice';
import pThrottle from 'p-throttle';
import { useAccount, usePublicClient } from 'wagmi';
import { useBalanceStore } from '../store/balancesStore';
import { ERC6909ABI, ERC6909Address } from '../services/ERC6909Metadata';

export function useUserTokenBalances(tokens: any, tokenIds: (string | number)[] = []) {
    const { address } = useAccount();
    const publicClient = usePublicClient();

    const setBalance = useBalanceStore((s) => s.setBalance);
    const getBalance = useBalanceStore((s) => s.getBalance);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [ethPrice, setEthPrice] = useState<number | null>(null);
    useEffect(() => {
        const loadEthPrice = async () => {
            const price = await fetchETHPrice();
            setEthPrice(price);
        };
        loadEthPrice();
    }, []);
    // Create throttled readContract function, binding the client context
    const throttledReadContract = useMemo(() => {
        return pThrottle({
            limit: 10,
            interval: 1000,
        })(publicClient.readContract.bind(publicClient));
    }, [publicClient]);

    // Fetch balance for a single tokenId
    const fetchBalance = useCallback(
        async (tokenId: string | number) => {
            if (!address) {
                return null
            };
            try {
                const balance = await throttledReadContract({
                    address: ERC6909Address,
                    abi: ERC6909ABI,
                    functionName: 'balanceOf',
                    args: [address, tokenId],
                });
                return balance as bigint;
            } catch (err) {
                console.error('Error fetching balance for tokenId', tokenId, err);
                return null;
            }
        },
        [address, throttledReadContract]
    );

    // Fetch all balances in batches
    const fetchAllBalances = useCallback(async () => {
        if (!address || tokenIds.length === 0) {
            return
        };
        setLoading(true);
        setError(null);
        try {
            const BATCH_SIZE = 20;

            for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
                const batch = tokenIds.slice(i, i + BATCH_SIZE);

                const results = await Promise.all(batch.map((tokenId) => fetchBalance(tokenId)));

                results.forEach((balance, idx) => {
                    const tokenIdStr = batch[idx].toString();
                    if (balance !== null) {
                        const tokenMeta = tokens.find((t: any) => t.tokenId.toString() === tokenIdStr);
                        const price = tokenMeta?.price;
                        setBalance(tokenIdStr, balance, 0, price);
                    }
                });

                // Small delay between batches to avoid rate limiting
                if (i + BATCH_SIZE < tokenIds.length) {
                    await new Promise((r) => setTimeout(r, 200));
                }
            }
        } catch (err: any) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [address, tokenIds, fetchBalance, setBalance]);

    // Fetch on mount or tokenIds change
    const hydrated = useBalanceStore((s) => s.hydrated);
    const balancesInStore = useBalanceStore((s) => s.balances);

    useEffect(() => {
        if (!address || tokenIds.length === 0) return;

        // Only fetch if store isn't hydrated or balances missing
        if (!hydrated || tokenIds.some(id => !balancesInStore[id.toString()])) {
            fetchAllBalances();
        }
    }, [address, JSON.stringify(tokenIds), hydrated, balancesInStore]);
    // Return balances from store
    const balances = tokenIds.map((tokenId) => {
        const stored = getBalance(tokenId.toString());
        const ethValue = stored?.totalValueEth ?? 0;
        return {
            tokenId: tokenId.toString(),
            balance: stored?.balance,
            formatted: stored?.formatted ?? '0',
            totalValueEth: ethValue,
            totalValueUsd: ethPrice !== null ? ethValue * ethPrice : null,
        };
    });

    return {
        balances,
        loading,
        error,
        refetch: fetchAllBalances,
    };
}
