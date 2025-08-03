import { throttledFetchIpfsMetadata } from "../lib/metadata/throttledFetchIpfsMetadata";
import { calculateTokenPrice } from "./calculateTokenPrice";
import { convertToIpfsUrl } from "./ipfs";
import { throttledFetchPrice } from "../lib/pricing/throttledFetchAllPrices";

// Cache of tokens that failed enrichment
const failedTokens = new Set<string>();

export const enrichTokens = async (
    currentTokens: any[],
    tokensToEnrich: any[],
    rawMetadata: any[],
    setTokens: (updatedTokens: any[]) => void
) => {
    try {
        const metadataMap = new Map<string, any>();
        rawMetadata.forEach((m) => {
            const id = m.tokenId.toString();
            metadataMap.set(id, m);
        });

        const enriched = await Promise.all(
            tokensToEnrich.map(async (token: any, index: number) => {
                const i = index;
                i;
                const tokenIdStr = token.tokenId.toString();
                if (failedTokens.has(tokenIdStr)) {
                    return currentTokens.find((t) => t.tokenId.toString() === tokenIdStr) || null;
                }

                try {
                    const onChain = metadataMap.get(tokenIdStr);
                    if (!onChain) {
                        console.warn(`⚠️ No on-chain metadata found for token ${tokenIdStr}`);
                        return null;
                    }

                    const ipfsData = onChain.uri
                        ? await throttledFetchIpfsMetadata(onChain.uri)
                        : null;

                    let calculatedPrice = null;
                    if (onChain.basePrice && onChain.slope && onChain.totalSupply) {
                        try {
                            calculatedPrice = calculateTokenPrice(
                                onChain.basePrice.toString(),
                                onChain.slope.toString(),
                                onChain.totalSupply.toString()
                            );
                        } catch (e) {
                            console.warn(`⚠️ Failed to calculate price for ${tokenIdStr}`, e);
                        }
                    }

                    let fetchedPrice: any = null;
                    try {
                        fetchedPrice = await throttledFetchPrice(BigInt(tokenIdStr));
                    } catch (err) {
                        console.warn(`⚠️ Failed to fetch live price for ${tokenIdStr}`, err);
                    }

                    const base = parseFloat(onChain.basePrice?.toString() || '0');
                    const current = parseFloat(fetchedPrice?.toString() || calculatedPrice?.toString() || '0');
                    const percentChange = base > 0 ? ((current - base) / base) * 100 : null;
                    return {
                        tokenId: token.tokenId,
                        name: token.name,
                        symbol: token.symbol,
                        blockTimestamp: token.blockTimestamp,
                        uri: onChain.uri ?? null,
                        description: ipfsData?.description ?? null,
                        imageUrl: ipfsData?.image ? convertToIpfsUrl(ipfsData.image) : null,
                        basePrice: onChain.basePrice?.toString() ?? null,
                        slope: onChain.slope?.toString() ?? null,
                        reserve: onChain.reserve?.toString() ?? null,
                        totalSupply: onChain.totalSupply?.toString() ?? null,
                        price: current?.toString() ?? null,
                        percentChange,
                        priceLastFetchedAt: Date.now(),
                        needsPriceUpdate: false,
                    };
                } catch (err: any) {
                    if (err?.status === 429 || err?.response?.status === 429) {
                        console.warn(`🚫 Rate limited on token ${token.name} (${tokenIdStr})`);
                        failedTokens.add(tokenIdStr);
                        setTimeout(() => failedTokens.delete(tokenIdStr), 5 * 60 * 1000);
                        return currentTokens.find((t) => t.tokenId.toString() === tokenIdStr) || null;
                    }

                    console.error(`❌ Error enriching token ${tokenIdStr}`, err);
                    return null;
                }
            })
        );

        const filtered = enriched.filter(Boolean);
        const updated = [...currentTokens];
        filtered.forEach((newToken: any) => {
            const index = updated.findIndex((t) => t.tokenId.toString() === newToken.tokenId.toString());
            if (index !== -1) {
                updated[index] = newToken;
            } else {
                updated.push(newToken);
            }
        });
        setTokens(updated);
        return filtered;
    } catch (error: any) {
        console.error("❌ Failed to enrich tokens", error);
    }
};
