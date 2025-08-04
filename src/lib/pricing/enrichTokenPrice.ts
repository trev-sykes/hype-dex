import { formatEther } from "viem";
import { fetchTokenMetadataRange } from "../../hooks/useContractRead";
import { throttledFetchPrice } from "./throttledFetchAllPrices";

export const enrichTokenPrice =
    async (tokens: any, tokenId: string, totalTokens: number, updateToken: any) => {
        console.log(`[enrichTokenPrice] Starting enrichment for tokenId: ${tokenId}`);
        try {
            const existingToken = tokens.find((t: any) => t.tokenId?.toString() === tokenId.toString());
            console.log(`[enrichTokenPrice] Found existing token:`, existingToken);

            let meta: any;

            if (existingToken) {
                meta = existingToken;
                console.log(`[enrichTokenPrice] Using existing metadata for tokenId ${tokenId}`);
            } else {
                console.log(`[enrichTokenPrice] Fetching metadata range 0 to ${totalTokens}`);
                const metadata: any = await fetchTokenMetadataRange(0, totalTokens);
                const tokenIdBigInt = BigInt(tokenId);
                meta = metadata.find((item: any) => BigInt(item.tokenId) === tokenIdBigInt);

                if (!meta) {
                    console.warn(`[enrichTokenPrice] Metadata for tokenId ${tokenId} not found`);
                    return null;
                }
                console.log(`[enrichTokenPrice] Fetched metadata for tokenId ${tokenId}:`, meta);
            }

            console.log(`[enrichTokenPrice] Fetching price for tokenId ${tokenId}`);
            const rawPrice: any = await throttledFetchPrice(BigInt(tokenId));
            console.log("RAW PRICE", rawPrice)

            const price = formatEther(rawPrice);
            console.log("FORMATTED PRICE", price);
            console.log(`[enrichTokenPrice] Price fetched for tokenId ${tokenId}:`, price);

            const base = parseFloat(meta.basePrice?.toString() || '0');
            const current = parseFloat(price?.toString() || '0');
            const percentChange = base > 0 ? ((current - base) / base) * 100 : null;
            console.log(`[enrichTokenPrice] basePrice: ${base}, currentPrice: ${current}, percentChange: ${percentChange}`);

            const enrichedData = {
                reserve: meta.reserve?.toString(),
                totalSupply: meta.totalSupply?.toString(),
                basePrice: meta.basePrice?.toString(),
                slope: meta.slope?.toString(),
                price: price?.toString(),
                percentChange,
                priceLastFetchedAt: Date.now(),
                needsPriceUpdate: false,
            };

            console.log(`[enrichTokenPrice] Updating token ${tokenId} with data:`, enrichedData);
            updateToken(tokenId, enrichedData);
        } catch (err) {
            console.error(`[enrichTokenPrice] Error enriching token price for tokenId ${tokenId}:`, err);
        }
    }
