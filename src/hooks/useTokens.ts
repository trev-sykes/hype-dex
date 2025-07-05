
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
// Max 5 concurrent IPFS metadata fetches per second
const throttledFetchIpfsMetadata = pThrottle({
    limit: 5,       // max 5 calls
    interval: 1000, // per 1000ms
})(fetchIpfsMetadata);

// Create a **single shared throttled function** for fetching token price
const throttledFetchPrice = pThrottle({ limit: 100, interval: 1000 })(fetchTokenPrice);

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

    // ✅ Fix: Allow GraphQL query to run even when tokens exist to fetch new ones
    const { data, isSuccess, refetch: refetchGraphQL }: any = useQuery({
        queryKey: ['tokens'],
        queryFn: () => request(url, tokenCreatedQuery, {}, headers),
        refetchInterval: 10000,
        refetchOnWindowFocus: false,
        enabled: !tokenId, // Only disable when fetching a specific token
    });

    // ✅ Fix: Compare GraphQL data with store to detect new tokens
    const fetchStaticMetadata = useCallback(async () => {
        if (!isSuccess || !data?.tokenCreateds?.length) return;

        // Check if we have new tokens from GraphQL that aren't in our store
        const existingTokenIds = new Set(tokens.map(t => t.tokenId.toString()));
        const newTokensFromGraphQL = data.tokenCreateds.filter(
            (token: any) => !existingTokenIds.has(token.tokenId.toString())
        );

        // If no new tokens, return existing tokens
        if (newTokensFromGraphQL.length === 0 && tokens.length > 0) {
            console.log('No new tokens detected from GraphQL');
            return tokens;
        }

        console.log(`Found ${newTokensFromGraphQL.length} new tokens from GraphQL`);

        const tokenIds: any = await fetchAllTokenIds();
        const rawMetadata: any = await fetchTokenMetadataRange(0, tokenIds.length);

        // Process all tokens from GraphQL (both existing and new)
        const staticTokens = await Promise.all(
            data.tokenCreateds.map(async (token: any) => {
                // Check if this token already exists in store with complete data
                const existingToken = tokens.find(t => t.tokenId.toString() === token.tokenId.toString());
                if (existingToken && existingToken.imageUrl !== null) {
                    // Return existing token if it has complete metadata
                    return existingToken;
                }

                const match = rawMetadata.find((m: any) => m.tokenId.toString() === token.tokenId.toString());
                if (!match) return existingToken || null;

                const ipfsData = await throttledFetchIpfsMetadata(match.uri);

                return {
                    tokenId: token.tokenId,
                    name: token.name,
                    symbol: token.symbol,
                    blockTimestamp: token.blockTimestamp,
                    uri: match.uri,
                    description: ipfsData?.description ?? null,
                    imageUrl: ipfsData?.image ? convertToIpfsUrl(ipfsData.image) : null,
                    // Preserve existing price data if available
                    basePrice: existingToken?.basePrice || null,
                    slope: existingToken?.slope || null,
                    reserve: existingToken?.reserve || null,
                    totalSupply: existingToken?.totalSupply || null,
                    price: existingToken?.price || null,
                    percentChange: existingToken?.percentChange || null,
                };
            })
        );

        const filtered = staticTokens.filter(Boolean);

        // Only update store if we have new data
        if (filtered.length !== tokens.length || newTokensFromGraphQL.length > 0) {
            console.log('Updating store with new/updated tokens');
            setTokens(filtered as any);
        }

        return filtered;
    }, [data, isSuccess, setTokens, tokens]);

    // Fetch all prices for tokens in bulk
    const fetchAllPrices = useCallback(async (tokens?: any[]) => {
        if (!tokens?.length) return;

        setLoading(true);
        setPricesLoaded(false);

        try {
            const tokenIds: any = await fetchAllTokenIds();
            const metadata: any = await fetchTokenMetadataRange(0, tokenIds.length);

            // Process tokens in batches to respect rate limits
            const batchSize = 50;
            for (let i = 0; i < tokens.length; i += batchSize) {
                const batch = tokens.slice(i, i + batchSize);

                await Promise.all(
                    batch.map(async (token: any) => {
                        try {
                            // Skip if this token already has price data
                            if (token.price !== null && token.price !== undefined) {
                                return;
                            }

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

    // ✅ Fix: Handle both initial load and updates from GraphQL
    useEffect(() => {
        if (tokenId) return; // Skip if fetching specific token

        const loadTokens = async () => {
            if (!hydrated) return; // Wait for hydration

            setLoading(true);
            try {
                const updatedTokens = await fetchStaticMetadata();

                // Only fetch prices for new tokens or if no prices loaded yet
                if (updatedTokens && (!pricesLoaded || updatedTokens.length > tokens.length)) {
                    await fetchAllPrices(updatedTokens);
                }
            } catch (err) {
                console.error('Error loading metadata and prices', err);
            } finally {
                setLoading(false);
            }
        };

        loadTokens();
    }, [hydrated, data, isSuccess, tokenId, fetchStaticMetadata, fetchAllPrices, pricesLoaded]);

    // Effect for single token loading (when tokenId is provided)
    useEffect(() => {
        if (!hydrated || !tokenId) return;
        fetchSingle();
    }, [hydrated, tokenId, fetchSingle]);

    // ✅ Add effect to handle GraphQL data changes
    useEffect(() => {
        if (!hydrated || tokenId || !data?.tokenCreateds) return;

        // Check if GraphQL returned new tokens
        // const graphQLTokenIds = new Set(data.tokenCreateds.map((t: any) => t.tokenId.toString()));
        const storeTokenIds = new Set(tokens.map(t => t.tokenId.toString()));

        const hasNewTokens = data.tokenCreateds.some((t: any) =>
            !storeTokenIds.has(t.tokenId.toString())
        );

        if (hasNewTokens) {
            console.log('New tokens detected from GraphQL, updating...');
            fetchStaticMetadata();
        }
    }, [data, hydrated, tokenId, tokens, fetchStaticMetadata]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!hydrated && tokens.length === 0) {
                console.warn('[Hydration] Zustand did not rehydrate in time, forcing fetch...');
                fetchStaticMetadata();
            }
        }, 2000); // 2 seconds timeout

        return () => clearTimeout(timeout);
    }, [hydrated, tokens.length, fetchStaticMetadata]);

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