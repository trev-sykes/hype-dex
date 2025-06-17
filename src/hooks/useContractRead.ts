import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from '../services/ETHBackedTokenMinter';
const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC;
const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
});

export async function fetchTokenPrice(tokenId: bigint) {
    try {
        return await publicClient.readContract({
            address: ETHBackedTokenMinterAddress,
            abi: ETHBackedTokenMinterABI,
            functionName: 'getPrice',
            args: [tokenId],
        });
    } catch (err: any) {
        console.error("fetchPrice error:", err.message);
        return null;
    }
}
export async function fetchAllTokenIds() {
    try {
        return await publicClient.readContract({
            address: ETHBackedTokenMinterAddress,
            abi: ETHBackedTokenMinterABI,
            functionName: 'getAllTokenIds',

        })
    } catch (err: any) {
        console.error("fetchAllTokenIds error:", err.message);
        return [];
    }
}
export async function fetchTokenMetadataRange(start: number, count: number) {
    try {
        return await publicClient.readContract({
            address: ETHBackedTokenMinterAddress,
            abi: ETHBackedTokenMinterABI,
            functionName: 'getTokenMetadataRange',
            args: [BigInt(start), BigInt(count)],
        });
    } catch (err: any) {
        console.error("getTokenMetadataRange error:", err.message);
        return [];
    }
}