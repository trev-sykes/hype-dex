import pThrottle from 'p-throttle';
import { useEffect, useCallback, useState } from 'react';
import { useTokenStore } from '../store/allTokensStore';
import request, { gql } from 'graphql-request';
import { useQuery } from 'wagmi/query';
import { convertToIpfsUrl, fetchIpfsMetadata } from '../utils/ipfs';
import { fetchAllTokenIds, fetchTokenMetadataRange, fetchTokenPrice } from './useContractRead';

const url = import.meta.env.VITE_GRAPHQL_URL;
const headers = { Authorization: 'Bearer {api-key}' };

const tokenCreatedQuery = gql`
{
    tokenCreateds(first: 100) {
        id
        tokenId
        name
        symbol
        blockTimestamp
    }
}
`;

// Create a **single shared throttled function** for fetching token price
const throttledFetchPrice = pThrottle({ limit: 20, interval: 1000 })(fetchTokenPrice);

export function useTokens(tokenId?: string) {
    const {
        tokens,
        hydrated,
        setTokens,
        updateToken,
        clearTokens
    } = useTokenStore();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [token, setToken] = useState<any>(null);
    const [pricesLoaded, setPricesLoaded] = useState(false);

    const { data, isSuccess, refetch: refetchGraphQL }: any = useQuery({
        queryKey: ['tokens'],
        queryFn: () => request(url, tokenCreatedQuery, {}, headers),
        refetchInterval: false,
        refetchOnWindowFocus: false,
        enabled: !tokenId && tokens.length === 0,
    });

    // Fetch static token metadata once the GraphQL data is available
    const fetchStaticMetadata = useCallback(async () => {
        if (!isSuccess || !data?.tokenCreateds?.length) return;

        const tokenIds: any = await fetchAllTokenIds();
        const rawMetadata: any = await fetchTokenMetadataRange(0, tokenIds.length);

        const staticTokens = await Promise.all(
            data.tokenCreateds.map(async (token: any) => {
                const match = rawMetadata.find((m: any) => m.tokenId.toString() === token.tokenId.toString());
                if (!match) return null;

                const ipfsData = await fetchIpfsMetadata(match.uri);
                return {
                    tokenId: token.tokenId,
                    name: token.name,
                    symbol: token.symbol,
                    blockTimestamp: token.blockTimestamp,
                    uri: match.uri,
                    description: ipfsData?.description ?? null,
                    imageUrl: ipfsData?.image ? convertToIpfsUrl(ipfsData.image) : null,
                    // Initialize price fields as null
                    basePrice: null,
                    slope: null,
                    reserve: null,
                    totalSupply: null,
                    price: null,
                    percentChange: null,
                };
            })
        );

        const filtered = staticTokens.filter(Boolean);
        setTokens(filtered as any);
        return filtered;
    }, [data, isSuccess, setTokens]);

    // Fetch all prices for tokens in bulk
    const fetchAllPrices = useCallback(async (tokens?: any[]) => {
        if (!tokens?.length) return;

        setLoading(true);
        setPricesLoaded(false);

        try {
            const tokenIds: any = await fetchAllTokenIds();
            const metadata: any = await fetchTokenMetadataRange(0, tokenIds.length);

            // Process tokens in batches to respect rate limits
            const batchSize = 10;
            for (let i = 0; i < tokens.length; i += batchSize) {
                const batch = tokens.slice(i, i + batchSize);

                await Promise.all(
                    batch.map(async (token: any) => {
                        try {
                            const meta = metadata.find((m: any) =>
                                m.tokenId.toString() === token.tokenId.toString()
                            );

                            if (!meta) return;

                            const price: any = await throttledFetchPrice(BigInt(token.tokenId));

                            const base = parseFloat(meta?.basePrice?.toString() || '0');
                            const current = parseFloat(price?.toString() || '0');
                            const percentChange: any = base > 0 ? ((current - base) / base) * 100 : null;

                            updateToken(token.tokenId, {
                                basePrice: meta.basePrice?.toString(),
                                slope: meta.slope?.toString(),
                                reserve: meta.reserve?.toString(),
                                totalSupply: meta.totalSupply?.toString(),
                                price: price?.toString(),
                                percentChange,
                            });
                        } catch (err) {
                            console.error('Error fetching price for token', token.tokenId, err);
                            // Update with null values to indicate price fetch failed
                            updateToken(token.tokenId, {
                                price: null,
                                percentChange: null,
                            });
                        }
                    })
                );

                // Add a small delay between batches
                if (i + batchSize < tokens.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } catch (err) {
            console.error('Error fetching all prices:', err);
        } finally {
            setLoading(false);
            setPricesLoaded(true);
        }
    }, [updateToken]);

    // Enrich token data with on-chain metadata and price — uses shared throttled price fetch
    const enrichToken = useCallback(async (tokenId: string, tokenIdsLength: any) => {
        try {
            const metadata: any = await fetchTokenMetadataRange(1, tokenIdsLength);
            const meta: any = metadata[0];
            const price: any = await throttledFetchPrice(BigInt(tokenId));

            const base = parseFloat(meta?.basePrice?.toString() || '0');
            const current = parseFloat(price?.toString() || '0');
            const percentChange: any = base > 0 ? ((current - base) / base) * 100 : null;

            updateToken(tokenId, {
                basePrice: meta.basePrice?.toString(),
                slope: meta.slope?.toString(),
                reserve: meta.reserve?.toString(),
                totalSupply: meta.totalSupply?.toString(),
                price: price?.toString(),
                percentChange,
            });

        } catch (err) {
            console.error('Error enriching token', tokenId, err);
        }
    }, [updateToken]);

    // Fetch a single token (for detail pages) — tries cache first, then fetches & enriches
    const fetchSingle = useCallback(async () => {
        if (!tokenId) return;
        setLoading(true);
        setError(null);

        try {
            const cached = tokens.find((t: any) => t.tokenId === tokenId);
            if (cached) {
                setToken(cached);
                setLoading(false);
                return;
            }

            await fetchStaticMetadata();

            const newCached = useTokenStore.getState().tokens.find((t: any) => t.tokenId === tokenId);
            if (newCached) {
                setToken(newCached);
                await enrichToken(tokenId, tokens.length);
            }
        } catch (err: any) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [tokenId, tokens, fetchStaticMetadata, enrichToken]);

    // Effect for initial token loading (when no tokenId and no tokens exist)
    useEffect(() => {
        if (!hydrated || tokenId || tokens.length > 0) return;
        fetchStaticMetadata();
    }, [hydrated, tokenId, tokens.length, fetchStaticMetadata]);

    // Effect for single token loading (when tokenId is provided)
    useEffect(() => {
        if (!hydrated || !tokenId) return;
        fetchSingle();
    }, [hydrated, tokenId, fetchSingle]);

    // Effect for price loading (when tokens exist but prices aren't loaded)
    useEffect(() => {
        if (!hydrated || tokenId || tokens.length === 0 || pricesLoaded) return;
        fetchAllPrices(tokens);
    }, [hydrated, tokenId, tokens.length, pricesLoaded, fetchAllPrices]);

    const refetch = useCallback(() => {
        if (!hydrated) return;
        setPricesLoaded(false);
        refetchGraphQL();
        fetchStaticMetadata().then(fetchAllPrices);
    }, [hydrated, fetchStaticMetadata, fetchAllPrices, refetchGraphQL]);

    return {
        tokens: tokenId ? [] : tokens,
        token: tokenId ? token : null,
        loading,
        error,
        refetch,
        clearTokens,
        enrichToken,
        pricesLoaded, // New flag to indicate if prices have been loaded
    };
}