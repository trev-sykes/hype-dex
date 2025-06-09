import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from '../services/ETHBackedTokenMinter';
import { convertToIpfsUrl } from './ipfs';
const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC;
const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
});

async function fetchPrice(tokenId: bigint) {
    try {
        return await publicClient.readContract({
            address: ETHBackedTokenMinterAddress,
            abi: ETHBackedTokenMinterABI,
            functionName: 'getPrice',
            args: [tokenId],
        });
    } catch (err: any) {
        console.error("fetchPrice error:", err.message);
        return null; // Explicit fallback
    }
}

async function fetchAllTokenIds(): Promise<any> {
    try {
        return await publicClient.readContract({
            address: ETHBackedTokenMinterAddress,
            abi: ETHBackedTokenMinterABI,
            functionName: 'getAllTokenIds',
        });
    } catch (err: any) {
        console.error("fetchAllTokenIds error:", err.message);
        return [];
    }
}

async function getMetadataFromURI(uri: string) {
    const url = convertToIpfsUrl(uri);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch IPFS data: ${response.statusText}`);
        return await response.json();
    } catch (err: any) {
        console.error("getMetadataFromURI error:", err.message);
        return null;
    }
}

export async function fetchAllCoinsData() {
    const tokens = await fetchAllTokenIds();
    const count = tokens.length;

    if (count === 0) {
        console.log("No tokens found");
        return [];
    }

    try {
        const rawCoinsData: any = await publicClient.readContract({
            address: ETHBackedTokenMinterAddress,
            abi: ETHBackedTokenMinterABI,
            functionName: 'getTokenMetadataRange',
            args: [BigInt(0), BigInt(count)],
        });

        // Fetch all metadata and prices concurrently for all tokens
        const enrichedData = await Promise.all(
            rawCoinsData.map(async (token: any) => {
                const [metadata, price] = await Promise.all([
                    getMetadataFromURI(token.uri),
                    fetchPrice(BigInt(token.tokenId)),
                ]);

                return {
                    ...token,
                    description: metadata?.description ?? null,
                    imageUrl: metadata?.image ? convertToIpfsUrl(metadata.image) : null,
                    price,
                };
            })
        );

        return enrichedData;
    } catch (err: any) {
        console.error("fetchAllCoinsData error:", err.message);
        return [];
    }
}
