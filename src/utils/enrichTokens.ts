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
        console.log("🔄 Starting token enrichment");
        console.log(`📦 Tokens to enrich: ${tokensToEnrich.length}`);
        console.log(`📚 Raw metadata entries: ${rawMetadata.length}`);

        const metadataMap = new Map<string, any>();
        rawMetadata.forEach((m) => {
            const id = m.tokenId.toString();
            metadataMap.set(id, m);
        });

        const enriched = await Promise.all(
            tokensToEnrich.map(async (token: any, index: number) => {
                const tokenIdStr = token.tokenId.toString();
                console.log(`\n🧪 Enriching token [${index + 1}/${tokensToEnrich.length}]: ${token.name} (${tokenIdStr})`);

                if (failedTokens.has(tokenIdStr)) {
                    console.log(`⏩ Skipping previously failed token ${tokenIdStr}`);
                    return currentTokens.find((t) => t.tokenId.toString() === tokenIdStr) || null;
                }

                try {
                    const onChain = metadataMap.get(tokenIdStr);
                    if (!onChain) {
                        console.warn(`⚠️ No on-chain metadata found for token ${tokenIdStr}`);
                        return null;
                    }

                    console.log(`🔗 Fetching IPFS metadata for token ${tokenIdStr}`);
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
                            console.log(`💰 Calculated local price: ${calculatedPrice}`);
                        } catch (e) {
                            console.warn(`⚠️ Failed to calculate price for ${tokenIdStr}`, e);
                        }
                    }

                    let fetchedPrice: any = null;
                    try {
                        console.log(`🌐 Fetching live price for ${tokenIdStr}`);
                        fetchedPrice = await throttledFetchPrice(BigInt(tokenIdStr));
                        console.log(`💵 Live price fetched: ${fetchedPrice?.toString()}`);
                    } catch (err) {
                        console.warn(`⚠️ Failed to fetch live price for ${tokenIdStr}`, err);
                    }

                    const base = parseFloat(onChain.basePrice?.toString() || '0');
                    const current = parseFloat(fetchedPrice?.toString() || calculatedPrice?.toString() || '0');
                    const percentChange = base > 0 ? ((current - base) / base) * 100 : null;

                    console.log(`📊 Price comparison — base: ${base}, current: ${current}, change: ${percentChange?.toFixed(2)}%`);

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
        console.log(`🧹 Filtered enriched tokens: ${filtered.length}`);

        const updated = [...currentTokens];
        filtered.forEach((newToken: any) => {
            const index = updated.findIndex((t) => t.tokenId.toString() === newToken.tokenId.toString());
            if (index !== -1) {
                updated[index] = newToken;
                console.log(`🔁 Updated existing token: ${newToken.tokenId}`);
            } else {
                updated.push(newToken);
                console.log(`➕ Added new token: ${newToken.tokenId}`);
            }
        });

        console.log(`[✅ enrichAndUpdateTokens] Total enriched: ${filtered.length}`);
        setTokens(updated);
        return filtered;
    } catch (error: any) {
        console.error("❌ Failed to enrich tokens", error);
    }
};
