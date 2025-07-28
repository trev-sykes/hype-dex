import { throttledFetchIpfsMetadata } from "../lib/metadata/throttledFetchIpfsMetadata";
import { convertToIpfsUrl } from "./ipfs";

export const enrichTokens = async (currentTokens: any, tokensToEnrich: any, allFetchedTokens: any, rawMetadata: any, setTokens: any,) => {
    try {
        const enriched = await Promise.all(
            tokensToEnrich.map(async (token: any) => {

                const tokenIdStr = token.tokenId.toString();
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
        console.warn("Failed to enrich tokens")
    }
}