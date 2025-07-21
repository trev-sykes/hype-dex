import pThrottle from 'p-throttle';
import { useEffect, useCallback, useState } from 'react';
import { useTokenStore } from '../store/allTokensStore';
import request from 'graphql-request';
import { useInfiniteQuery } from 'wagmi/query';
import { convertToIpfsUrl, fetchIpfsMetadata } from '../utils/ipfs';
import { fetchAllTokenIds, fetchTokenMetadataRange, fetchTokenPrice } from './useContractRead';
import type { TokensQueryResult } from '../types/token';
import { tokenCreatedQuery } from '../graphQl/tokenCreatedQuery';
import { getDominantColor } from '../utils/colorTheif';


const url = import.meta.env.VITE_GRAPHQL_URL;
const headers = { Authorization: 'Bearer {api-key}' };

const PAGE_SIZE = 10;
const throttledFetchIpfsMetadata = pThrottle({ limit: 50, interval: 10000 })(fetchIpfsMetadata);
const throttledFetchPrice = pThrottle({ limit: 50, interval: 10000 })(fetchTokenPrice);

export function useTokens(tokenId?: string) {
    const { tokens, hydrated, setTokens, updateToken, clearTokens } = useTokenStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [token, setToken] = useState<any>(null);
    const [pricesLoaded, setPricesLoaded] = useState(false);

    // Infinite Query for paginated tokens
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch: refetchGraphQL,
        isSuccess,
    } = useInfiniteQuery<TokensQueryResult, Error, TokensQueryResult, string[]>({
        queryKey: ['tokens'],
        queryFn: async ({ pageParam = 0 }) => {
            return request(url, tokenCreatedQuery, { first: PAGE_SIZE, skip: pageParam }, headers);
        },
        getNextPageParam: (lastPage, allPages) => {
            // If last page returned fewer than PAGE_SIZE, no more pages
            if (lastPage.tokenCreateds.length < PAGE_SIZE) return undefined;
            return allPages.length * PAGE_SIZE;
        },
        initialPageParam: 0,
        enabled: !tokenId,
        refetchInterval: 10000,
        refetchOnWindowFocus: false,
    });
    // Flatten all tokens fetched across pages
    const allFetchedTokens: any = data?.pages.flatMap((p: any) => p.tokenCreateds) || [];
    const fetchStaticMetadata = useCallback(async () => {
        if (!isSuccess) {
            console.log('[fetchStaticMetadata] Skipping: query not successful');
            return
        };

        const currentTokens = useTokenStore.getState().tokens;

        // 1. Build sets for logic
        const existingIds = new Set(currentTokens.map((t: any) => t.tokenId.toString()));
        const newTokens = allFetchedTokens.filter((t: any) => !existingIds.has(t.tokenId.toString()));
        const incompleteTokens = currentTokens.filter((t: any) => !t.imageUrl || !t.description);
        // 🔍 Log incomplete tokens found in store
        if (incompleteTokens.length > 0) {
            console.log(`[fetchStaticMetadata] Found ${incompleteTokens.length} incomplete tokens in store:`, incompleteTokens.map(t => t.tokenId.toString()));
        }

        // 2. Merge new tokens and incomplete ones (avoiding duplicates)
        const tokensToEnrichMap = new Map<string, any>();

        newTokens.forEach((t: any) => tokensToEnrichMap.set(t.tokenId.toString(), t));
        incompleteTokens.forEach(t => {
            if (!tokensToEnrichMap.has(t.tokenId.toString())) {
                tokensToEnrichMap.set(t.tokenId.toString(), t);
            }
        });

        const tokensToEnrich = Array.from(tokensToEnrichMap.values());
        // 🧠 Log which tokens we will enrich
        if (tokensToEnrich.length > 0) {
            console.log(`[fetchStaticMetadata] Enriching ${tokensToEnrich.length} tokens:`, tokensToEnrich.map(t => t.tokenId.toString()));
        } else {
            console.log('[fetchStaticMetadata] No tokens to enrich.');
            return currentTokens;
        }

        if (tokensToEnrich.length === 0) return currentTokens;

        const tokenIds: any = await fetchAllTokenIds();
        const rawMetadata: any = await fetchTokenMetadataRange(0, tokenIds.length);

        const enriched = await Promise.all(
            tokensToEnrich.map(async (token: any) => {
                const tokenIdStr = token.tokenId.toString();
                const gqlToken = allFetchedTokens.find((t: any) => t.tokenId.toString() === tokenIdStr) || token;
                const existing = currentTokens.find(t => t.tokenId.toString() === tokenIdStr);

                const match = rawMetadata.find((m: any) => m.tokenId.toString() === tokenIdStr);
                if (!match) return existing || null;

                const ipfsData = await throttledFetchIpfsMetadata(match.uri);

                let color = null;
                if (ipfsData?.image) {
                    try {
                        const imageUrl = convertToIpfsUrl(ipfsData.image);
                        console.log(`Loading image for token ${tokenIdStr}:`, imageUrl);
                        const img: any = new Image();
                        img.crossOrigin = 'Anonymous';
                        img.src = imageUrl;

                        color = await new Promise<string | null>((resolve) => {
                            img.onload = async () => {
                                try {
                                    const c = await getDominantColor(img);
                                    console.log(`Color for ${tokenIdStr}: ${c}`);
                                    resolve(c);
                                } catch (err) {
                                    console.warn('Failed to get color:', err);
                                    resolve(null);
                                }
                            };
                            img.onerror = () => {
                                console.warn(`Image failed to load for token ${tokenIdStr}`);
                                resolve(null);
                            };
                        });
                    } catch (e) {
                        console.warn('getDominantColor failed:', e);
                    }
                }
                console.log(`✅ [Enrich Complete] Token ${tokenIdStr} enriched`);
                return {
                    tokenId: gqlToken.tokenId,
                    name: gqlToken.name,
                    symbol: gqlToken.symbol,
                    blockTimestamp: gqlToken.blockTimestamp,
                    uri: match.uri,
                    description: ipfsData?.description ?? null,
                    imageUrl: ipfsData?.image ? convertToIpfsUrl(ipfsData.image) : null,
                    color,
                    basePrice: existing?.basePrice || null,
                    slope: existing?.slope || null,
                    reserve: existing?.reserve || null,
                    totalSupply: existing?.totalSupply || null,
                    price: existing?.price || null,
                    percentChange: existing?.percentChange || null,
                };
            })
        );

        const updated = [...currentTokens];
        const filtered = enriched.filter(Boolean);
        filtered.forEach((f: any) => {
            const index = updated.findIndex(t => t.tokenId.toString() === f.tokenId.toString());
            if (index !== -1) {
                updated[index] = f;
            } else {
                updated.push(f);
            }
        });
        console.log(`[fetchStaticMetadata] Finished updating tokens. Total enriched: ${filtered.length}`);
        setTokens(updated);
        return filtered;
    }, [allFetchedTokens, isSuccess, setTokens]);

    const fetchAllPrices = useCallback(
        async (tokensToFetch?: any[]) => {
            if (!tokensToFetch?.length) return;

            setLoading(true);
            setPricesLoaded(false);

            try {
                const tokenIds: any = await fetchAllTokenIds();
                const metadata: any = await fetchTokenMetadataRange(0, tokenIds.length);

                const batchSize = 10;
                for (let i = 0; i < tokensToFetch.length; i += batchSize) {
                    const batch = tokensToFetch.slice(i, i + batchSize);

                    await Promise.all(
                        batch.map(async token => {
                            try {
                                if (token.price != null) return;

                                const meta = metadata.find((m: any) => m.tokenId.toString() === token.tokenId.toString());
                                if (!meta) return;

                                const price: any = await throttledFetchPrice(BigInt(token.tokenId));

                                const base = parseFloat(meta.basePrice?.toString() || '0');
                                const current = parseFloat(price?.toString() || '0');
                                const percentChange = base > 0 ? ((current - base) / base) * 100 : null;

                                updateToken(token.tokenId, {
                                    basePrice: meta.basePrice?.toString(),
                                    slope: meta.slope?.toString(),
                                    reserve: meta.reserve?.toString(),
                                    totalSupply: meta.totalSupply?.toString(),
                                    price: price?.toString(),
                                    percentChange,
                                });
                            } catch (err) {
                                console.error('Failed price for token', token.tokenId, err);
                                updateToken(token.tokenId, { price: null, percentChange: null });
                            }
                        })
                    );

                    if (i + batchSize < tokensToFetch.length) {
                        await new Promise(res => setTimeout(res, 100));
                    }
                }
            } catch (err) {
                console.error('Error in fetchAllPrices:', err);
            } finally {
                setLoading(false);
                setPricesLoaded(true);
            }
        },
        [updateToken]
    );

    // Single token enrich logic (same as before)
    const enrichToken = useCallback(
        async (tokenId: string, totalTokens: number) => {
            try {
                const metadata: any = await fetchTokenMetadataRange(1, totalTokens);
                const meta = metadata[0];
                const price: any = await throttledFetchPrice(BigInt(tokenId));

                const base = parseFloat(meta?.basePrice?.toString() || '0');
                const current = parseFloat(price?.toString() || '0');
                const percentChange = base > 0 ? ((current - base) / base) * 100 : null;

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
        },
        [updateToken]
    );

    // Fetch single token metadata & enrich
    const fetchSingle = useCallback(async () => {
        if (!tokenId) return;
        setLoading(true);
        setError(null);

        try {
            const cached = tokens.find(t => t.tokenId === tokenId);
            if (cached) {
                setToken(cached);
                setLoading(false);
                return;
            }

            await fetchStaticMetadata();
            const refreshed = useTokenStore.getState().tokens.find(t => t.tokenId === tokenId);
            if (refreshed) {
                setToken(refreshed);
                await enrichToken(tokenId, tokens.length);
            }
        } catch (err: any) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [tokenId, tokens, fetchStaticMetadata, enrichToken]);

    // Load all tokens (no tokenId)
    useEffect(() => {
        if (tokenId || hydrated) return; // ✅ Fixed condition
        const load = async () => {
            setLoading(true);
            try {
                const enrichedTokens = await fetchStaticMetadata();

                // Use the returned tokens instead of stale closure
                if (!pricesLoaded && enrichedTokens && enrichedTokens.length > 0) {
                    await fetchAllPrices(enrichedTokens);
                }
            } catch (err) {
                console.error('loadTokens error', err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [hydrated, allFetchedTokens.length, fetchStaticMetadata, fetchAllPrices, pricesLoaded, tokenId]);

    // Fetch single token if tokenId present
    useEffect(() => {
        if (!hydrated || !tokenId) return;
        fetchSingle();
    }, [hydrated, tokenId, fetchSingle]);

    // Force refetch if new tokens appear
    useEffect(() => {
        if (!hydrated || tokenId || !allFetchedTokens.length) return;
        const storeIds = new Set(tokens.map(t => t.tokenId.toString()));
        const hasNew = allFetchedTokens.some((t: any) => !storeIds.has(t.tokenId.toString()));
        if (hasNew) {
            fetchStaticMetadata();
        }
    }, [allFetchedTokens, hydrated, tokenId, tokens, fetchStaticMetadata]);

    // Fallback hydration slow check
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (hydrated && tokens.length === 0) {
                console.warn('Zustand hydration slow, forcing metadata fetch...');
                fetchStaticMetadata();
            }
        }, 2000);
        return () => clearTimeout(timeout);
    }, [hydrated, tokens.length, fetchStaticMetadata]);

    const refetch = useCallback(() => {
        setPricesLoaded(false);
        refetchGraphQL();
        fetchStaticMetadata().then(fetchAllPrices);
    }, [hydrated, fetchStaticMetadata, fetchAllPrices, refetchGraphQL]);
    useEffect(() => {
        // Find tokens missing imageUrl or color
        const incompleteTokens = tokens.filter(t => !t.imageUrl || !t.description);
        if (incompleteTokens.length) {
            fetchStaticMetadata();
        }
    }, [tokens, fetchStaticMetadata]);

    return {
        tokens: tokenId ? [] : tokens,
        token: tokenId ? token : null,
        loading: loading || isFetchingNextPage,
        error,
        refetch,
        clearTokens,
        enrichToken,
        fetchNextPage,
        fetchStaticMetadata,
        hasNextPage,
        pricesLoaded,
    };
}
