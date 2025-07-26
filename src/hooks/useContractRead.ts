import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from '../services/ETHBackedTokenMinter';
import { ERC6909ABI, ERC6909Address } from '../services/ERC6909Metadata';
const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC;
const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
});
export async function fetchTokenTotalSupply(tokenId: bigint) {
    try {
        return await publicClient.readContract({
            address: ERC6909Address,
            abi: ERC6909ABI,
            functionName: 'totalSupply',
            args: [tokenId],
        });
    } catch (err: any) {
        console.error("fetchPrice error:", err.message);
        return null;
    }
}
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
export async function fetchTokenExists(tokenId: bigint) {
    try {
        return await publicClient.readContract({
            address: ETHBackedTokenMinterAddress,
            abi: ETHBackedTokenMinterABI,
            functionName: 'tokenExists',
            args: [tokenId],
        });
    } catch (err: any) {
        console.error("fetchTokenExists error:", err.message);
        return false;
    }
}

export async function fetchTokenConfig(tokenId: bigint) {
    try {
        return await publicClient.readContract({
            address: ETHBackedTokenMinterAddress,
            abi: ETHBackedTokenMinterABI,
            functionName: 'tokenConfigs',
            args: [tokenId],
        });
    } catch (err: any) {
        console.error("fetchTokenConfig error:", err.message);
        return null;
    }
}
