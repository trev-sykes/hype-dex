// import { useEffect, useCallback, useState, useRef } from 'react';
// import { useTokenStore } from '../store/allTokensStore';

// import { convertToIpfsUrl } from '../utils/ipfs';
// import { fetchAllTokenIds, fetchTokenMetadataRange } from './useContractRead';
// import { getDominantColor } from '../utils/colorTheif';
// import { useTradeStore } from '../store/tradeStore';
// import { throttledFetchIpfsMetadata } from '../lib/metadata/throttledFetchIpfsMetadata';
// import { throttledFetchPrice } from '../lib/pricing/throttledFetchAllPrices';
// // import { fetchMetadata } from '../lib/metadata/fetchMetadata';
// // import { usePaginatedTokens } from './usePaginatedTokens';
// const now = Date.now();
// const TTL = 60 * 60_000; // or whatever

// export function useTokens(tokenId?: string) {
//     const [hasEnrichedPostHydration, setHasEnrichedPostHydration] = useState(false);
//     const { tokens, hydrated, setTokens, updateToken, clearTokens } = useTokenStore();
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState<Error | null>(null);
//     const [token, setToken] = useState<any>(null);
//     const [pricesLoaded, setPricesLoaded] = useState(false);
//     const isLoadingRef = useRef(false);
//     const isFetchingStaticMetadataRef = useRef(false);

//     // Infinite Query for paginated tokens
//     const {
//         data,
//         fetchNextPage,
//         hasNextPage,
//         isFetchingNextPage,
//         refetch: refetchGraphQL,
//         isSuccess,
//     }: any = usePaginatedTokens(!tokenId && hydrated)
//     // Flatten all tokens fetched across pages
//     const allFetchedTokens: any = data?.pages.flatMap((p: any) => p.tokenCreateds) || [];

//     const fetchStaticMetadata = useCallback(async (source = "unknown") => {
//         console.log(`Call from ${source}`);
//         if (isFetchingStaticMetadataRef.current) {
//             console.log('[fetchStaticMetadata] Skipped: already fetching');
//             return;
//         }
//         if (!isSuccess) {
//             console.log('[fetchStaticMetadata] Skipping: query not successful');
//             return
//         };
//         isFetchingStaticMetadataRef.current = true;
//         const nowSeconds = Math.floor(Date.now() / 1000);
//         const NEW_TOKEN_AGE_LIMIT = (24) * 10 * 60; // 10 minutes in seconds

//         const currentTokens = useTokenStore.getState().tokens;

//         // 1. Build sets for logic
//         const existingIds = new Set(currentTokens.map((t: any) => t.tokenId.toString()));
//         const newTokens = allFetchedTokens.filter((t: any) => !existingIds.has(t.tokenId.toString()));
//         const tradeMap = useTradeStore.getState().trades;

//         const incompleteTokens = currentTokens.filter((t: any) => {
//             const isMissing = (v: any) => v === null || v === undefined;
//             // const hasSamePrice = t.price && t.basePrice && t.price.toString() === t.basePrice.toString();
//             const priceEqualsBase = t.price && t.basePrice && t.price.toString() === t.basePrice.toString();
//             const hasNoSupply = t.totalSupply === '0' || t.totalSupply === 0;

//             // 🧠 Check if this token has any trades
//             const tokenTrades = tradeMap[t.tokenId];
//             const hasTrades = Array.isArray(tokenTrades) && tokenTrades.length > 0;
//             const tokenAgeSeconds = nowSeconds - parseInt(t.blockTimestamp ?? '0', 10);
//             const isNew = tokenAgeSeconds < NEW_TOKEN_AGE_LIMIT;
//             // 💡 Skip logic should NOT apply if image is missing
//             const isImageMissing = !t.imageUrl;
//             const shouldSkipNewWithNoTrades = isNew && !hasTrades;
//             const shouldSkipOldWithNoSupplyAndTrades = hasNoSupply && hasTrades;

//             // const shouldSkip = shouldSkipNewWithNoTrades || shouldSkipOldWithNoSupplyAndTrades;
//             if (shouldSkipNewWithNoTrades || shouldSkipOldWithNoSupplyAndTrades) {
//                 console.log(`[Skip Enrich] Token(${t.name}): Skipped due to skip logic new with no trades${shouldSkipNewWithNoTrades} old wiht no supply and trades: ${shouldSkipOldWithNoSupplyAndTrades}`);
//                 return false;
//             }

//             const needsEnrichment = (
//                 isImageMissing ||
//                 !t.description ||
//                 isMissing(t.basePrice) ||
//                 isMissing(t.price) ||
//                 (!hasTrades)
//             );
//             if (needsEnrichment) {
//                 console.log(`Token ${t.name} needs enrichment:`, {
//                     missingImage: !t.imageUrl,
//                     missingDescription: !t.description,
//                     missingBasePrice: isMissing(t.basePrice),
//                     missingPrice: isMissing(t.price),
//                     hasTrades: !hasTrades,
//                     priceEqualsBase: priceEqualsBase
//                 });
//             }

//             return (
//                 needsEnrichment
//             );
//         });

//         // 🔍 Log incomplete tokens found in store
//         if (incompleteTokens.length > 0) {
//             console.log(`[fetchStaticMetadata] Found ${incompleteTokens.length} incomplete tokens in store:`, incompleteTokens.map(t => t.name));
//         }

//         // 2. Merge new tokens and incomplete ones (avoiding duplicates)
//         const tokensToEnrichMap = new Map<string, any>();

//         newTokens.forEach((t: any) => tokensToEnrichMap.set(t.tokenId.toString(), t));
//         incompleteTokens.forEach(t => {
//             if (!tokensToEnrichMap.has(t.tokenId.toString())) {
//                 tokensToEnrichMap.set(t.tokenId.toString(), t);
//             }
//         });

//         const tokensToEnrich = Array.from(tokensToEnrichMap.values());
//         // 🧠 Log which tokens we will enrich
//         if (tokensToEnrich.length > 0) {
//             console.log(`[fetchStaticMetadata] Enriching ${tokensToEnrich.length} tokens:`, tokensToEnrich.map(t => t.name));
//         } else {
//             console.log('[fetchStaticMetadata] No tokens to enrich.');
//             return currentTokens;
//         }

//         if (tokensToEnrich.length === 0) return currentTokens;

//         const tokenIds: any = await fetchAllTokenIds();
//         const rawMetadata: any = await fetchTokenMetadataRange(0, tokenIds.length);

//         const enriched = await Promise.all(
//             tokensToEnrich.map(async (token: any) => {
//                 const tokenIdStr = token.tokenId.toString();
//                 const gqlToken = allFetchedTokens.find((t: any) => t.tokenId.toString() === tokenIdStr) || token;
//                 const existing = currentTokens.find(t => t.tokenId.toString() === tokenIdStr);

//                 const match = rawMetadata.find((m: any) => m.tokenId.toString() === tokenIdStr);
//                 if (!match) return existing || null;

//                 const ipfsData = await throttledFetchIpfsMetadata(match.uri);

//                 let color = null;
//                 if (ipfsData?.image) {
//                     try {
//                         const imageUrl = convertToIpfsUrl(ipfsData.image);
//                         console.log(`Loading image for token ${tokenIdStr}:`, imageUrl);
//                         const img: any = new Image();
//                         img.crossOrigin = 'Anonymous';
//                         img.src = imageUrl;

//                         color = await new Promise<string | null>((resolve) => {
//                             img.onload = async () => {
//                                 try {
//                                     const c = await getDominantColor(img);
//                                     console.log(`Color for ${tokenIdStr}: ${c}`);
//                                     resolve(c);
//                                 } catch (err) {
//                                     console.warn('Failed to get color:', err);
//                                     resolve(null);
//                                 }
//                             };
//                             img.onerror = () => {
//                                 console.warn(`Image failed to load for token ${tokenIdStr}`);
//                                 resolve(null);
//                             };
//                         });
//                     } catch (e) {
//                         console.warn('getDominantColor failed:', e);
//                     }
//                 }
//                 console.log(`✅ [Enrich Complete] Token ${token.name} enriched`);
//                 return {
//                     tokenId: gqlToken.tokenId,
//                     name: gqlToken.name,
//                     symbol: gqlToken.symbol,
//                     blockTimestamp: gqlToken.blockTimestamp,
//                     uri: match.uri,
//                     description: ipfsData?.description ?? null,
//                     imageUrl: ipfsData?.image ? convertToIpfsUrl(ipfsData.image) : null,
//                     color,
//                     basePrice: existing?.basePrice || null,
//                     slope: existing?.slope || null,
//                     reserve: existing?.reserve || null,
//                     totalSupply: existing?.totalSupply || null,
//                     price: existing?.price || null,
//                     percentChange: existing?.percentChange || null,
//                 };
//             })
//         );

//         const updated = [...currentTokens];
//         const filtered = enriched.filter(Boolean);
//         filtered.forEach((f: any) => {
//             const index = updated.findIndex(t => t.tokenId.toString() === f.tokenId.toString());
//             if (index !== -1) {
//                 updated[index] = f;
//             } else {
//                 updated.push(f);
//             }
//         });
//         console.log(`[fetchStaticMetadata] Finished updating tokens. Total enriched: ${filtered.length}`);
//         setTokens(updated);
//         isFetchingStaticMetadataRef.current = false;
//         return filtered;
//     }, [allFetchedTokens, isSuccess, setTokens]);

//     const fetchAllPrices = useCallback(
//         async (tokensToFetch?: any[], metadata?: any[]) => {
//             if (!tokensToFetch?.length) return;
//             console.log(`🔍 [fetchAllPrices] Starting price fetch for ${tokensToFetch.length} tokens`);

//             setLoading(true);
//             setPricesLoaded(false);
//             try {
//                 // Use provided metadata or fetch if not provided
//                 if (!metadata) {
//                     // metadata = await fetchMetadata();
//                 }
//                 const tokenMetadata: any = metadata
//                 console.log(`📊 [fetchAllPrices] ${tokenMetadata.length} metadata entries`);

//                 const isMissing = (v: any) => v === null || v === undefined;

//                 const tokensNeedingPrice: any = tokensToFetch.filter((token) => {
//                     const { price, priceLastFetchedAt, needsPriceUpdate } = token;
//                     const isStale = !priceLastFetchedAt || now - priceLastFetchedAt > TTL;
//                     const missingPrice = isMissing(price);

//                     const shouldUpdate =
//                         needsPriceUpdate === true || missingPrice || isStale;

//                     if (!shouldUpdate) {
//                         console.log(`🔍 ${token.symbol}does NOT need updating:`);
//                         console.log("   ⏳ Stale:", isStale);
//                         console.log("   ⛔ Missing price:", missingPrice);
//                         console.log("   🔁 Dirty flag:", needsPriceUpdate);
//                     } else {
//                         console.log("🔍 Token needs updating:");
//                         console.log("   ⏳ Stale:", isStale);
//                         console.log("   ⛔ Missing price:", missingPrice);
//                         console.log("   🔁 Dirty flag:", needsPriceUpdate);
//                     }
//                     return shouldUpdate;
//                 });

//                 if (tokensNeedingPrice.length === 0) {
//                     console.log('[fetchAllPrices] No tokens need price updates');
//                     setLoading(false);
//                     setPricesLoaded(true);
//                     return;
//                 }

//                 console.log(`🔄 [fetchAllPrices] Processing ${tokensNeedingPrice.length} tokens needing price updates`);

//                 const batchSize = 50;
//                 for (let i = 0; i < tokensNeedingPrice.length; i += batchSize) {
//                     const batch = tokensNeedingPrice.slice(i, i + batchSize);
//                     console.log(`🔄 [fetchAllPrices] Processing batch ${Math.floor(i / batchSize) + 1}, tokens:`, batch.map((t: any) => t.name));

//                     for (const token of batch) {
//                         try {
//                             console.log(`💰 [Price Check] Token ${token.name}: current price = ${token.price}`);

//                             const meta = tokenMetadata.find((m: any) => m.tokenId.toString() === token.tokenId.toString());
//                             if (!meta) {
//                                 console.warn(`❌ [fetchAllPrices] No metadata found for token ${token.name}`);
//                                 continue;
//                             }

//                             console.log(`📋 [Metadata] Token ${token.name}:`, {
//                                 basePrice: meta.basePrice?.toString(),
//                                 totalSupply: meta.totalSupply?.toString(),
//                                 slope: meta.slope?.toString(),
//                                 reserve: meta.reserve?.toString(),
//                             });

//                             const price: any = await throttledFetchPrice(BigInt(token.tokenId));
//                             console.log(`💲 [Price Fetched] Token ${token.name}: ${price?.toString()}`);

//                             const base = parseFloat(meta.basePrice?.toString() || '0');
//                             const current = parseFloat(price?.toString() || '0');
//                             const percentChange = base > 0 ? ((current - base) / base) * 100 : null;
//                             console.log(`📈 [Price Calculation] Token ${token.name}: base=${base}, current=${current}, change=${percentChange}%`);

//                             updateToken(token.tokenId, {
//                                 basePrice: meta.basePrice?.toString(),
//                                 slope: meta.slope?.toString(),
//                                 reserve: meta.reserve?.toString(),
//                                 totalSupply: meta.totalSupply?.toString(),
//                                 price: price?.toString(),
//                                 percentChange,
//                                 priceLastFetchedAt: Date.now(),
//                                 needsPriceUpdate: false,
//                             });
//                             console.log(`✅ [Updated] Token ${token.name} updated successfully`);

//                             await new Promise(res => setTimeout(res, 150)); // 150ms delay between tokens
//                         } catch (err: any) {
//                             console.error('Failed price for token', token.tokenId, err);
//                             updateToken(token.tokenId, { price: null, percentChange: null });

//                             if (err.message?.includes('429') || err.message?.includes('Too Many Requests')) {
//                                 console.log('⏳ Rate limited, waiting 3 seconds...');
//                                 await new Promise(res => setTimeout(res, 3000));
//                             }
//                         }
//                     }

//                     if (i + batchSize < tokensNeedingPrice.length) {
//                         console.log('⏳ Waiting 2 seconds before next batch...');
//                         await new Promise(res => setTimeout(res, 2000));
//                     }
//                 }
//             } catch (err) {
//                 console.error('❌ [fetchAllPrices] Major error:', err);
//             } finally {
//                 setLoading(false);
//                 setPricesLoaded(true);
//                 console.log('✅ [fetchAllPrices] Completed');
//             }
//         },
//         [updateToken]
//     );

//     const enrichToken = useCallback(
//         async (tokenId: string, totalTokens: number) => {
//             try {
//                 const metadata: any = await fetchTokenMetadataRange(1, totalTokens);
//                 // Convert tokenId string to bigint or number for comparison (assuming bigint here)
//                 const tokenIdBigInt = BigInt(tokenId);

//                 // Find the token metadata matching the tokenId
//                 const meta = metadata.find((item: any) => BigInt(item.tokenId) === tokenIdBigInt);

//                 if (!meta) {
//                     console.warn(`Metadata for tokenId ${tokenId} not found`);
//                     return null;
//                 }

//                 const price: any = await throttledFetchPrice(BigInt(tokenId));

//                 const base = parseFloat(meta?.basePrice?.toString() || '0');
//                 const current = parseFloat(price?.toString() || '0');
//                 const percentChange = base > 0 ? ((current - base) / base) * 100 : null;
//                 console.log(`${meta.symbol} ENRICHED`);
//                 updateToken(tokenId, {
//                     reserve: meta.reserve?.toString(),
//                     totalSupply: meta.totalSupply?.toString(),
//                     price: price?.toString(),
//                     percentChange,
//                 });
//             } catch (err) {
//                 console.error('Error enriching token', tokenId, err);
//             }
//         },
//         [updateToken]
//     );

//     // Fetch single token metadata & enrich
//     const fetchSingle = useCallback(async () => {
//         if (!tokenId) return;
//         setLoading(true);
//         setError(null);

//         try {
//             const cached = tokens.find(t => t.tokenId === tokenId);
//             if (cached) {
//                 setToken(cached);
//                 setLoading(false);
//                 return;
//             }
//             if (isSuccess) {
//                 fetchStaticMetadata("Fetch Single");
//             }

//             const refreshed = useTokenStore.getState().tokens.find(t => t.tokenId === tokenId);
//             if (refreshed) {
//                 setToken(refreshed);
//                 await enrichToken(tokenId, tokens.length);
//             }
//         } catch (err: any) {
//             setError(err);
//         } finally {
//             setLoading(false);
//         }
//     }, [tokenId, tokens, fetchStaticMetadata, enrichToken]);
//     const load = async () => {
//         if (tokenId || !hydrated || loading || !isSuccess) return;  // <- add isSuccess here
//         setLoading(true);
//         try {
//             const enrichedTokens = await fetchStaticMetadata("Load");
//             // Use the returned tokens instead of stale closure
//             if (!pricesLoaded && enrichedTokens && enrichedTokens.length > 0) {
//                 await fetchAllPrices(enrichedTokens);
//             }
//         } catch (err) {
//             console.error('loadTokens error', err);
//         } finally {
//             setLoading(false);
//             isLoadingRef.current = false;
//         }
//     };
//     // Load all tokens (no tokenId)
//     useEffect(() => {
//         if (tokenId || !hydrated || loading) return;
//         load();
//     }, [allFetchedTokens.length, fetchStaticMetadata, fetchAllPrices, pricesLoaded, tokenId]);
//     // Fetch single token if tokenId present
//     useEffect(() => {
//         if (!hydrated || !tokenId) return;
//         fetchSingle();
//     }, [hydrated, tokenId, fetchSingle]);

//     // Force refetch if new tokens appear
//     useEffect(() => {
//         if (!hydrated || tokenId || !allFetchedTokens.length) return;
//         const storeIds = new Set(tokens.map(t => t.tokenId.toString()));
//         const hasNew = allFetchedTokens.some((t: any) => !storeIds.has(t.tokenId.toString()));
//         if (hasNew && isSuccess) {
//             fetchStaticMetadata("useEffect if new tokens appear");
//         }
//     }, [allFetchedTokens, hydrated, tokenId, tokens, fetchStaticMetadata]);

//     // Fallback hydration slow check
//     useEffect(() => {
//         const timeout = setTimeout(() => {
//             if (!hydrated && tokens.length === 0) {
//                 console.warn('Zustand hydration slow, forcing metadata fetch...');
//                 fetchStaticMetadata("fallback hydration slow check");
//             }
//         }, 2000);
//         return () => clearTimeout(timeout);
//     }, [hydrated, tokens.length, fetchStaticMetadata]);

//     const refetch = useCallback(() => {
//         setPricesLoaded(false);
//         refetchGraphQL();
//         fetchStaticMetadata("refetch").then(fetchAllPrices);
//     }, [hydrated, fetchStaticMetadata, fetchAllPrices, refetchGraphQL]);


//     useEffect(() => {
//         if (!hydrated || hasEnrichedPostHydration || tokenId || !isSuccess) return;

//         const currentTokens = useTokenStore.getState().tokens;
//         const isMissing = (v: any) => v === null || v === undefined;

//         const incomplete = currentTokens.some(
//             (t: any) => {
//                 return (
//                     !t.imageUrl ||
//                     !t.description ||
//                     isMissing(t.basePrice) ||
//                     isMissing(t.price)
//                 );
//             }
//         );

//         if (incomplete) {
//             console.log('[Hydration Enrich Trigger] Incomplete tokens found, enriching...');
//             setHasEnrichedPostHydration(true);
//             fetchStaticMetadata("Incomplete Tokens Hook").then(fetchAllPrices);
//         }
//     }, [hydrated, hasEnrichedPostHydration, tokenId, fetchStaticMetadata, fetchAllPrices]);

//     useEffect(() => {
//         const unsubscribe = useTradeStore.getState().subscribeToNewTrades((trade) => {
//             const tokenId = trade.tokenId;
//             console.log(`[useTokens] New trade detected for token ${trade.tokenId}, triggering enrichment`);
//             enrichToken(tokenId.toString(), tokens.length); // ✅ Enrich the traded token
//         });

//         return () => unsubscribe();
//     }, [tokens.length, enrichToken]);

//     return {
//         tokens: tokenId ? [] : tokens,
//         token: tokenId ? token : null,
//         loading: loading || isFetchingNextPage,
//         error,
//         refetch,
//         clearTokens,
//         enrichToken,
//         fetchNextPage,
//         fetchStaticMetadata,
//         hasNextPage,
//         pricesLoaded,
//     };
// }
