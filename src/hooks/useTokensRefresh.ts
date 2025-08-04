import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useTokenStore } from '../store/allTokensStore';
import { fetchMetaDataFromBlockchain } from '../lib/metadata/fetchMetadata';
import { fetchTokenIds } from '../lib/metadata/fetchTokenIds';
import { sanitizeTokensForStorage, toStringOrNull } from '../utils/sanitizeTokenForStorage';
import { convertToIpfsUrl } from '../utils/ipfs';
import { calculateTokenPrice } from '../utils/calculateTokenPrice';
import { enrichTokens } from '../utils/enrichTokens';

const REFRESH_INTERVAL_MS = 60 * 60 * 10000; // 1 hour

export function useTokensRefresh(tokenId?: string) {
    const { tokens, hydrated, setTokens, clearTokens } = useTokenStore();
    const isFetchingRef = useRef(false);
    const [loading, setLoading] = useState(false);

    const shouldFetchInitial = hydrated && tokens.length === 0 && !tokenId;

    const fetchStaticMetadata = useCallback(async (source = "unknown") => {
        console.log(source)
        if (isFetchingRef.current) {

            return;
        }

        isFetchingRef.current = true;
        setLoading(true);

        try {
            const tokenIds = await fetchTokenIds();
            const rawMetadata = await fetchMetaDataFromBlockchain(0, tokenIds.length);

            const formattedTokens = rawMetadata.map((token: any) => {
                const basePrice = toStringOrNull(token.basePrice);
                const slope: any = toStringOrNull(token.slope);
                const totalSupply: any = toStringOrNull(token.totalSupply);

                const price = calculateTokenPrice(
                    token.basePrice?.toString(),
                    slope,
                    totalSupply
                );
                return {
                    tokenId: token.tokenId.toString(),
                    name: token.name,
                    symbol: token.symbol,
                    blockTimestamp: token.blockTimestamp,
                    uri: token.uri ?? null,
                    description: token.description ?? null,
                    imageUrl: token.image ? convertToIpfsUrl(token.image) : null,
                    basePrice,
                    slope,
                    reserve: toStringOrNull(token.reserve),
                    totalSupply,
                    price,
                    percentChange: token.percentChange ?? null,
                    priceLastFetchedAt: Date.now(),
                    needsPriceUpdate: false,
                };
            });

            const enrichedTokens: any = await enrichTokens(tokens, formattedTokens, rawMetadata, setTokens);


            const sanitizedTokens: any = sanitizeTokensForStorage(enrichedTokens);

            setTokens(sanitizedTokens);

        } catch (error) {
            console.warn("Issue fetching static metadata", error);
        } finally {
            isFetchingRef.current = false;
            setLoading(false);
        }
    }, [setTokens]);

    // Initial fetch if empty
    useEffect(() => {
        if (shouldFetchInitial) {
            fetchStaticMetadata("initial fetch");
        }
    }, [shouldFetchInitial, fetchStaticMetadata]);

    // Background refetch every minute
    useEffect(() => {
        const interval = setInterval(() => {
            if (hydrated && !tokenId) {
                fetchStaticMetadata("interval refresh from useTokensRefresh");
            }
        }, REFRESH_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [hydrated, tokenId, fetchStaticMetadata]);

    // Token filtering if tokenId is provided
    const filteredTokens = useMemo(() => {
        if (!tokenId) return tokens;
        return tokens.filter(t => t.tokenId === tokenId);
    }, [tokens, tokenId]);

    return {
        tokens: filteredTokens,
        loading,
        clearTokens,
        fetchStaticMetadata,
    };
}
