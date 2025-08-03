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
    const { tokens, hydrated, updateToken } = useTokenStore();
    const [loading, setLoading] = useState(false);
    const [tokenLength, setTokenLength] = useState(tokens.length);
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
        // refetch: refetchGraphQL,
        isSuccess,
    } = fetchPaginatedTokens(PAGE_SIZE, !tokenId && !hydrated)
    // Flatten all tokens fetched across pages
    const allFetchedTokens: any = data?.pages.flatMap((p: any) => p.tokenCreateds) || [];
    const fetchAllPrices = useCallback(
        async (tokensToFetch?: any[], metadata?: any[]) => {
            if (!tokensToFetch?.length) return;
            setLoading(true);
            setPricesLoaded(false);
            try {
                // Use provided metadata or fetch if not provided
                if (!metadata) {
                    metadata = await fetchMetaDataFromBlockchain(1, tokenLength);
                }
                const tokenMetadata: any = metadata

                const isMissing = (v: any) => v === null || v === undefined;

                const tokensNeedingPrice: any = tokensToFetch.filter((token) => {
                    const { price, priceLastFetchedAt, needsPriceUpdate } = token;
                    const isStale = !priceLastFetchedAt || now - priceLastFetchedAt > TTL;
                    const missingPrice = isMissing(price);

                    const shouldUpdate =
                        needsPriceUpdate === true || missingPrice || isStale;

                    if (!shouldUpdate) {

                    } else {
                    }
                    return shouldUpdate;
                });

                if (tokensNeedingPrice.length === 0) {
                    setLoading(false);
                    setPricesLoaded(true);
                    return;
                }
                const batchSize = 50;
                for (let i = 0; i < tokensNeedingPrice.length; i += batchSize) {
                    const batch = tokensNeedingPrice.slice(i, i + batchSize);
                    for (const token of batch) {
                        try {
                            const meta = tokenMetadata.find((m: any) => m.tokenId.toString() === token.tokenId.toString());
                            if (!meta) {
                                console.warn(`❌ [fetchAllPrices] No metadata found for token ${token.name}`);
                                continue;
                            }

                            // console.log(`📋 [Metadata] Token ${token.name}:`, {
                            //     basePrice: meta.basePrice?.toString(),
                            //     totalSupply: meta.totalSupply?.toString(),
                            //     slope: meta.slope?.toString(),
                            //     reserve: meta.reserve?.toString(),
                            // });

                            const price: any = await throttledFetchPrice(BigInt(token.tokenId));

                            const base = parseFloat(meta.basePrice?.toString() || '0');
                            const current = parseFloat(price?.toString() || '0');
                            const percentChange = base > 0 ? ((current - base) / base) * 100 : null;
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
                            await new Promise(res => setTimeout(res, 150)); // 150ms delay between tokens
                        } catch (err: any) {
                            console.error('Failed price for token', token.tokenId, err);
                            updateToken(token.tokenId, { price: null, percentChange: null });

                            if (err.message?.includes('429') || err.message?.includes('Too Many Requests')) {
                                await new Promise(res => setTimeout(res, 3000));
                            }
                        }
                    }

                    if (i + batchSize < tokensNeedingPrice.length) {
                        await new Promise(res => setTimeout(res, 2000));
                    }
                }
            } catch (err) {
                console.error('❌ [fetchAllPrices] Major error:', err);
            } finally {
                setLoading(false);
                setPricesLoaded(true);
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
                    meta = existingToken;
                } else {
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

        try {
            const cached = tokens.find(t => t.tokenId === tokenId);
            if (cached) {
                setLoading(false);
                return;
            }
            const refreshed = useTokenStore.getState().tokens.find(t => t.tokenId === tokenId);
            if (refreshed) {
                await enrichTokenPrice(tokenId, tokens.length);
            }
        } catch (err: any) {
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
            setHasEnrichedPostHydration(true);
        }
    }, [hydrated, hasEnrichedPostHydration, tokenId, fetchAllPrices]);

    useEffect(() => {
        const unsubscribe = useTradeStore.getState().subscribeToNewTrades((trade) => {
            const tokenId = trade.tokenId;
            enrichTokenPrice(tokenId.toString(), tokens.length); // ✅ Enrich the traded token
        });
        return () => unsubscribe();
    }, [tokens.length, enrichTokenPrice]);

    return {
        fetchNextPage,
        fetchAllPrices,
        hasNextPage,
    };
}