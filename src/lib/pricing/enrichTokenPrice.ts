import { fetchTokenMetadataRange } from "../../hooks/useContractRead";
import { throttledFetchPrice } from "./throttledFetchAllPrices";

export const enrichTokenPrice =
    async (tokens: any, tokenId: string, totalTokens: number, updateToken: any) => {
        try {
            const existingToken = tokens.find((t: any) => t.tokenId?.toString() === tokenId.toString());

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

            const price: any = await throttledFetchPrice(BigInt(tokenId));

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
    }