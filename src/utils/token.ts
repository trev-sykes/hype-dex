import { fetchAllTokenIds, fetchTokenMetadataRange, fetchTokenPrice } from "../hooks/useContractRead";
import { convertToIpfsUrl, fetchIpfsMetadata } from "./ipfs";

/**
 * Fetches full token data by tokenId.
 * Uses index-based range query after resolving tokenId to index.
 */
export async function fetchSingleToken(tokenId: string | bigint) {
    const idStr = tokenId.toString();

    try {
        const allTokenIds = await fetchAllTokenIds();
        if (!Array.isArray(allTokenIds) || allTokenIds.length === 0) {
            console.warn("[fetchSingleToken] Token list is empty or invalid.");
            return null;
        }

        const index = allTokenIds.findIndex(id => id?.toString?.() === idStr);

        if (index < 0 || index >= allTokenIds.length) {
            console.warn(`[fetchSingleToken] Token ID ${idStr} not found in token list.`);
            return null;
        }

        const metadataArray: any = await fetchTokenMetadataRange(index, 1).catch(err => {
            console.error(`[fetchSingleToken] Metadata range fetch failed:`, err);
            return null;
        });

        const metadata = metadataArray?.[0];
        if (!metadata || !metadata.uri) {
            console.warn(`[fetchSingleToken] Metadata for index ${index} is missing or invalid.`);
            return null;
        }

        const [price, ipfsData] = await Promise.all([
            fetchTokenPrice(BigInt(idStr)).catch(err => {
                console.warn(`Price fetch failed for token ${idStr}:`, err);
                return null;
            }),
            fetchIpfsMetadata(metadata.uri).catch(err => {
                console.warn(`IPFS fetch failed for URI ${metadata.uri}:`, err);
                return null;
            }),
        ]);

        return {
            tokenId: idStr,
            uri: metadata.uri,
            basePrice: metadata.basePrice ?? null,
            slope: metadata.slope ?? null,
            reserve: metadata.reserve ?? null,
            totalSupply: metadata.totalSupply ?? null,
            price,
            description: ipfsData?.description ?? null,
            imageUrl: ipfsData?.image ? convertToIpfsUrl(ipfsData.image) : null,
        };
    } catch (err) {
        console.error("[fetchSingleToken] Unexpected error:", err);
        return null;
    }
}
