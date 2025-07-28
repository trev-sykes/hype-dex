// import { fetchMetadata } from "../../lib/metadata/fetchMetadata";
// import { throttledFetchPrice } from "../../lib/pricing/throttledFetchAllPrices";
// import { useTokenStore } from "../../store/allTokensStore";

// export const enrichToken = async (tokenId: string) => {
//     const { updateToken } = useTokenStore();
//     try {
//         const metadata: any = await fetchMetadata()
//         // Convert tokenId string to bigint or number for comparison (assuming bigint here)
//         const tokenIdBigInt = BigInt(tokenId);

//         // Find the token metadata matching the tokenId
//         const meta = metadata.find((item: any) => BigInt(item.tokenId) === tokenIdBigInt);

//         if (!meta) {
//             console.warn(`Metadata for tokenId ${tokenId} not found`);
//             return null;
//         }

//         const price: any = await throttledFetchPrice(BigInt(tokenId));

//         const base = parseFloat(meta?.basePrice?.toString() || '0');
//         const current = parseFloat(price?.toString() || '0');
//         const percentChange = base > 0 ? ((current - base) / base) * 100 : null;
//         console.log(`${meta.symbol} ENRICHED`);
//         updateToken(tokenId, {
//             reserve: meta.reserve?.toString(),
//             totalSupply: meta.totalSupply?.toString(),
//             price: price?.toString(),
//             percentChange,
//         });
//     } catch (err) {
//         console.error('Error enriching token', tokenId, err);
//     }
// }
