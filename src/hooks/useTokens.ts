import { useEffect, useCallback, useState, useRef } from 'react';
import { useTokenStore } from '../store/allTokensStore';
import { fetchAllTokenIds, fetchTokenMetadataRange } from './useContractRead';
import { useTradeStore } from '../store/tradeStore';
import { throttledFetchPrice } from '../lib/pricing/throttledFetchAllPrices';
import { fetchPaginatedTokens } from '../graphQl/fetchPaginatedTokens';
import { fetchMetaDataFromBlockchain } from '../lib/metadata/fetchMetadata';

import { formatUnits } from 'viem';

const PAGE_SIZE = 50;
const now = Date.now();
const TTL = 60 * 60_000;
export function useTokens(tokenId?: string) {
    const [hasEnrichedPostHydration, setHasEnrichedPostHydration] = useState(false);
    const { tokens, hydrated, updateToken, clearTokens } = useTokenStore();
    const [loading, setLoading] = useState(false);
    const [tokenLength, setTokenLength] = useState(tokens.length);
    const [error, setError] = useState<Error | null>(null);
    const [token, setToken] = useState<any>(null);
    const [pricesLoaded, setPricesLoaded] = useState(false);
    const isLoadingRef = useRef(false);
    useEffect(() => {
        if (tokenLength <= 0) {
            const tokenIds: any = fetchAllTokenIds();
            setTokenLength(tokenIds.length)
        }
    }, [])
    // Infinite Query for paginated tokens
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        // refetch: refetchGraphQL,
        isSuccess,
    } = fetchPaginatedTokens(PAGE_SIZE, !tokenId && !hydrated)
    // Flatten all tokens fetched across pages
    const allFetchedTokens: any = data?.pages.flatMap((p: any) => p.tokenCreateds) || [];

    const fetchAllPrices = useCallback(
        async (tokensToFetch?: any[], metadata?: any[]) => {
            if (!tokensToFetch?.length) return;
            console.log(`🔍 [fetchAllPrices] Starting price fetch for ${tokensToFetch.length} tokens`);

            setLoading(true);
            setPricesLoaded(false);
            try {
                // Use provided metadata or fetch if not provided
                if (!metadata) {
                    metadata = await fetchMetaDataFromBlockchain(1, tokenLength);
                }
                const tokenMetadata: any = metadata
                console.log(`📊 [fetchAllPrices] ${tokenMetadata.length} metadata entries`);

                const isMissing = (v: any) => v === null || v === undefined;

                const tokensNeedingPrice: any = tokensToFetch.filter((token) => {
                    const { price, priceLastFetchedAt, needsPriceUpdate } = token;
                    const isStale = !priceLastFetchedAt || now - priceLastFetchedAt > TTL;
                    const missingPrice = isMissing(price);

                    const shouldUpdate =
                        needsPriceUpdate === true || missingPrice || isStale;

                    if (!shouldUpdate) {
                        console.log(`🔍 ${token.symbol}does NOT need updating:`);
                        console.log("   ⏳ Stale:", isStale);
                        console.log("   ⛔ Missing price:", missingPrice);
                        console.log("   🔁 Dirty flag:", needsPriceUpdate);
                    } else {
                        console.log("🔍 Token needs updating:");
                        console.log("   ⏳ Stale:", isStale);
                        console.log("   ⛔ Missing price:", missingPrice);
                        console.log("   🔁 Dirty flag:", needsPriceUpdate);
                    }
                    return shouldUpdate;
                });

                if (tokensNeedingPrice.length === 0) {
                    console.log('[fetchAllPrices] No tokens need price updates');
                    setLoading(false);
                    setPricesLoaded(true);
                    return;
                }

                console.log(`🔄 [fetchAllPrices] Processing ${tokensNeedingPrice.length} tokens needing price updates`);

                const batchSize = 50;
                for (let i = 0; i < tokensNeedingPrice.length; i += batchSize) {
                    const batch = tokensNeedingPrice.slice(i, i + batchSize);
                    console.log(`🔄 [fetchAllPrices] Processing batch ${Math.floor(i / batchSize) + 1}, tokens:`, batch.map((t: any) => t.name));

                    for (const token of batch) {
                        try {
                            console.log(`💰 [Price Check] Token ${token.name}: current price = ${token.price}`);

                            const meta = tokenMetadata.find((m: any) => m.tokenId.toString() === token.tokenId.toString());
                            if (!meta) {
                                console.warn(`❌ [fetchAllPrices] No metadata found for token ${token.name}`);
                                continue;
                            }

                            console.log(`📋 [Metadata] Token ${token.name}:`, {
                                basePrice: meta.basePrice?.toString(),
                                totalSupply: meta.totalSupply?.toString(),
                                slope: meta.slope?.toString(),
                                reserve: meta.reserve?.toString(),
                            });

                            const price: any = await throttledFetchPrice(BigInt(token.tokenId));
                            console.log(`💲 [Price Fetched] Token ${token.name}: ${price?.toString()}`);

                            const base = parseFloat(meta.basePrice?.toString() || '0');
                            const current = parseFloat(price?.toString() || '0');
                            const percentChange = base > 0 ? ((current - base) / base) * 100 : null;
                            console.log(`📈 [Price Calculation] Token ${token.name}: base=${base}, current=${current}, change=${percentChange}%`);

                            updateToken(token.tokenId.toString(), {
                                basePrice: meta.basePrice?.toString(),
                                slope: meta.slope?.toString(),
                                reserve: meta.reserve?.toString(),
                                totalSupply: meta.totalSupply?.toString(),
                                price: price?.toString(),
                                percentChange,
                                priceLastFetchedAt: Date.now(),
                                needsPriceUpdate: false,
                            });
                            console.log(`✅ [Updated] Token ${token.name} updated successfully`);

                            await new Promise(res => setTimeout(res, 150)); // 150ms delay between tokens
                        } catch (err: any) {
                            console.error('Failed price for token', token.tokenId, err);
                            updateToken(token.tokenId, { price: null, percentChange: null });

                            if (err.message?.includes('429') || err.message?.includes('Too Many Requests')) {
                                console.log('⏳ Rate limited, waiting 3 seconds...');
                                await new Promise(res => setTimeout(res, 3000));
                            }
                        }
                    }

                    if (i + batchSize < tokensNeedingPrice.length) {
                        console.log('⏳ Waiting 2 seconds before next batch...');
                        await new Promise(res => setTimeout(res, 2000));
                    }
                }
            } catch (err) {
                console.error('❌ [fetchAllPrices] Major error:', err);
            } finally {
                setLoading(false);
                setPricesLoaded(true);
                console.log('✅ [fetchAllPrices] Completed');
            }
        },
        [updateToken]
    );

    const enrichTokenPrice = useCallback(
        async (tokenId: string, totalTokens: number) => {
            try {
                const tokenStore = useTokenStore.getState().tokens;
                const existingToken = tokenStore.find(t => t.tokenId?.toString() === tokenId.toString());

                let meta: any;

                if (existingToken) {
                    console.log(`[enrichTokenPrice] Using store data for token ${tokenId}`);
                    meta = existingToken;
                } else {
                    console.log(`[enrichTokenPrice] Token ${tokenId} not in store — fetching metadata`);
                    const metadata: any = await fetchTokenMetadataRange(0, totalTokens);
                    const tokenIdBigInt = BigInt(tokenId);
                    meta = metadata.find((item: any) => BigInt(item.tokenId) === tokenIdBigInt);

                    if (!meta) {
                        console.warn(`Metadata for tokenId ${tokenId} not found`);
                        return null;
                    }
                }

                const rawPrice: any = await throttledFetchPrice(BigInt(tokenId));
                const price = formatUnits(rawPrice, 18).toString()
                const base = parseFloat(meta.basePrice?.toString() || '0');
                const current = parseFloat(price?.toString() || '0');
                const percentChange = base > 0 ? ((current - base) / base) * 100 : null;

                console.log(`[enrichTokenPrice] Enriched ${meta.symbol || tokenId}`);

                updateToken(tokenId, {
                    reserve: meta.reserve?.toString(),
                    totalSupply: meta.totalSupply?.toString(),
                    basePrice: meta.basePrice?.toString(),
                    slope: meta.slope?.toString(),
                    price: price?.toString(),
                    percentChange,
                    priceLastFetchedAt: Date.now(),
                    needsPriceUpdate: false,
                });
            } catch (err) {
                console.error('Error enriching token price', tokenId, err);
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
            const refreshed = useTokenStore.getState().tokens.find(t => t.tokenId === tokenId);
            if (refreshed) {
                setToken(refreshed);
                await enrichTokenPrice(tokenId, tokens.length);
            }
        } catch (err: any) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [tokenId, tokens, enrichTokenPrice]);
    const load = async () => {
        if (tokenId || !hydrated || loading || !isSuccess) return;  // <- add isSuccess here
        setLoading(true);
        try {
            // Use the returned tokens instead of stale closure
            if (!pricesLoaded) {
                await fetchAllPrices();
            }
        } catch (err) {
            console.error('loadTokens error', err);
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    };
    // Load all tokens (no tokenId)
    useEffect(() => {
        if (tokenId || !hydrated || loading) return;
        load();
    }, [allFetchedTokens.length, fetchAllPrices, pricesLoaded, tokenId]);
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
        if (hasNew && isSuccess) {
        }
    }, [allFetchedTokens, hydrated, tokenId, tokens]);

    // Fallback hydration slow check
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!hydrated && tokens.length === 0) {
                console.warn('Zustand hydration slow, forcing metadata fetch...');
            }
        }, 2000);
        return () => clearTimeout(timeout);
    }, [hydrated, tokens.length]);

    const refetch = useCallback(() => {
        setPricesLoaded(false);
    }, [hydrated, fetchAllPrices]);


    useEffect(() => {
        if (!hydrated || hasEnrichedPostHydration || tokenId || !isSuccess) return;

        const currentTokens = useTokenStore.getState().tokens;
        const isMissing = (v: any) => v === null || v === undefined;

        const incomplete = currentTokens.some(
            (t: any) => {
                return (
                    !t.imageUrl ||
                    !t.description ||
                    isMissing(t.basePrice) ||
                    isMissing(t.price)
                );
            }
        );

        if (incomplete) {
            console.log('[Hydration Enrich Trigger] Incomplete tokens found, enriching...');
            setHasEnrichedPostHydration(true);
        }
    }, [hydrated, hasEnrichedPostHydration, tokenId, fetchAllPrices]);

    useEffect(() => {
        const unsubscribe = useTradeStore.getState().subscribeToNewTrades((trade) => {
            const tokenId = trade.tokenId;
            console.log(`[useTokens] New trade detected for token ${trade.tokenId}, triggering enrichment`);
            enrichTokenPrice(tokenId.toString(), tokens.length); // ✅ Enrich the traded token
        });

        return () => unsubscribe();
    }, [tokens.length, enrichTokenPrice]);

    return {
        tokens: tokenId ? [] : tokens,
        token: tokenId ? token : null,
        loading: loading || isFetchingNextPage,
        error,
        refetch,
        clearTokens,
        fetchNextPage,
        fetchAllPrices,
        hasNextPage,
        pricesLoaded,
    };
}