import { throttledFetchIpfsMetadata } from "../lib/metadata/throttledFetchIpfsMetadata";
import { convertToIpfsUrl } from "./ipfs";
// Keep a cache of tokens that recently failed enrichment due to rate limiting
const failedTokens = new Set<string>();

export const enrichTokens = async (
    currentTokens: any,
    tokensToEnrich: any,
    allFetchedTokens: any,
    rawMetadata: any,
    setTokens: any,
) => {
    try {
        const enriched = await Promise.all(
            tokensToEnrich.map(async (token: any) => {
                const tokenIdStr = token.tokenId.toString();

                // Skip tokens that recently failed enrichment due to 429
                if (failedTokens.has(tokenIdStr)) {
                    console.log(`Skipping enrichment for token ${token.name} (${tokenIdStr}) due to recent rate limit`);
                    // Return the existing token as is or null to exclude
                    const existing = currentTokens.find((t: any) => t.tokenId.toString() === tokenIdStr);
                    return existing || null;
                }

                try {
                    const gqlToken = allFetchedTokens.find((t: any) => t.tokenId.toString() === tokenIdStr) || token;
                    const existing = currentTokens.find((t: any) => t.tokenId.toString() === tokenIdStr);
                    console.log(`🔍 Looking for metadata match for tokenId: ${tokenIdStr}`);
                    console.log(`rawMetadata:`, rawMetadata);

                    const match = rawMetadata.find((m: any) => m.tokenId.toString() === tokenIdStr);
                    if (!match) return existing || null;

                    const ipfsData = await throttledFetchIpfsMetadata(match.uri);
                    console.log(`✅ [Enrich Complete] Token ${token.name} enriched`);

                    return {
                        tokenId: gqlToken.tokenId,
                        name: gqlToken.name,
                        symbol: gqlToken.symbol,
                        blockTimestamp: gqlToken.blockTimestamp,
                        uri: match.uri,
                        description: ipfsData?.description ?? null,
                        imageUrl: ipfsData?.image ? convertToIpfsUrl(ipfsData.image) : null,
                        basePrice: existing?.basePrice || null,
                        slope: existing?.slope || null,
                        reserve: existing?.reserve || null,
                        totalSupply: existing?.totalSupply || null,
                        price: existing?.price || null,
                        percentChange: existing?.percentChange || null,
                    };
                } catch (err: any) {
                    // Check for rate limiting error (adjust depending on your error structure)
                    if (err?.status === 429 || err?.response?.status === 429) {
                        console.warn(`Rate limited enriching token ${token.name} (${tokenIdStr}). Skipping for now.`);
                        failedTokens.add(tokenIdStr);
                        // Remove from failedTokens after 5 minutes (adjust timing as needed)
                        setTimeout(() => failedTokens.delete(tokenIdStr), 5 * 60 * 1000);
                        // Return existing token as fallback
                        const existing = currentTokens.find((t: any) => t.tokenId.toString() === tokenIdStr);
                        return existing || null;
                    }
                    // For other errors, rethrow or handle accordingly
                    throw err;
                }
            })
        );

        const filtered = enriched.filter(Boolean);
        const updated = [...currentTokens];
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
    } catch (error: any) {
        console.warn("Failed to enrich tokens", error);
    }
};
