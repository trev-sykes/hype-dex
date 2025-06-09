import pThrottle from 'p-throttle';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTokenStore } from '../store/allTokensStore';
import request, { gql } from 'graphql-request';
import { useQuery } from 'wagmi/query';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from '../services/ETHBackedTokenMinter';
import { convertToIpfsUrl } from '../utils/ipfs';

const IPFS_GATEWAYS = [
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
    "https://ipfs.io/ipfs/",
];

const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC;
const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
});

const url = import.meta.env.VITE_GRAPHQL_URL;
const headers = { Authorization: 'Bearer {api-key}' };

const tokenCreatedQuery = gql`
{
    tokenCreateds(first: 100) {
        id
        tokenId
        name
        symbol
        blockTimestamp
    }
}
`;

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
        return null;
    }
}

async function fetchAllTokenIds() {
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

async function fetchTokenMetadataRange(start: number, count: number) {
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

async function getMetadataFromURI(uri: string): Promise<any | null> {
    const cid = uri.replace(/^ipfs:\/\//, "").replace("ipfs/", "");
    const cached = localStorage.getItem(`ipfs_${cid}`);
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch { }
    }

    for (const gateway of IPFS_GATEWAYS) {
        try {
            const res = await fetch(`${gateway}${cid}`, { cache: "no-store" });
            if (res.ok) {
                const json = await res.json();
                localStorage.setItem(`ipfs_${cid}`, JSON.stringify(json));
                return json;
            }
        } catch { }
    }
    return null;
}


async function fetchSingleToken(tokenId: string | bigint) {
    const idStr = tokenId.toString();
    try {
        const allTokenIds: any = await fetchAllTokenIds();
        const index = allTokenIds.findIndex((id: any) => id.toString() === idStr);
        if (index === -1) return null;

        const [meta]: any = await fetchTokenMetadataRange(index, 1);
        if (!meta) return null;

        const [price, metaJson] = await Promise.all([
            fetchPrice(BigInt(idStr)),
            getMetadataFromURI(meta.uri),
        ]);

        return {
            tokenId: idStr,
            uri: meta.uri,
            basePrice: meta.basePrice,
            slope: meta.slope,
            reserve: meta.reserve,
            totalSupply: meta.totalSupply,
            price,
            description: metaJson?.description ?? null,
            imageUrl: metaJson?.image ? convertToIpfsUrl(metaJson.image) : null,
        };
    } catch (err) {
        console.error("fetchSingleToken error:", err);
        return null;
    }
}

export function useTokens(tokenId?: string) {
    const tokens = useTokenStore((state: any) => state.tokens);
    const setTokens = useTokenStore((state: any) => state.setTokens);
    const addToken = useTokenStore((state: any) => state.addToken);
    const clearTokens = useTokenStore((state: any) => state.clearTokens);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [token, setToken] = useState<any>(null);

    const { data, isSuccess, refetch: refetchGraphQL }: any = useQuery({
        queryKey: ['tokens'],
        queryFn: () => request(url, tokenCreatedQuery, {}, headers),
        refetchInterval: false,
        refetchOnWindowFocus: false,
        enabled: !tokenId && tokens.length === 0,
    });

    const newTokens: any = useMemo(() => {
        if (!data || !isSuccess) return [];
        return data.tokenCreateds;
    }, [data, isSuccess]);

    const fetchSingle = useCallback(async () => {
        if (!tokenId) return;
        setLoading(true);
        setError(null);

        const cached = tokens.find((t: any) => t.tokenId === tokenId);
        if (cached) {
            setToken(cached);
            setLoading(false);
            return;
        }

        try {
            const result = await fetchSingleToken(tokenId);
            setToken(result);
            if (result) addToken(result);
        } catch (err: any) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [tokenId, tokens, addToken]);

    const fetchAllAndEnrich = useCallback(async () => {
        if (!newTokens.length) return;
        setLoading(true);
        setError(null);

        try {
            const tokenIds: any = await fetchAllTokenIds();
            const count = tokenIds.length;
            const rawMetadata: any = await fetchTokenMetadataRange(0, count);

            const throttledFetchPrice = pThrottle({
                limit: 5,
                interval: 1000,
            })(fetchPrice);

            const enriched = await Promise.all(
                newTokens.map(async (token: any) => {
                    const tokenIdStr = token.tokenId.toString();

                    if (tokens.some((t: any) => t.tokenId === tokenIdStr)) return null;

                    const match = rawMetadata.find((m: any) => m.tokenId.toString() === tokenIdStr);
                    if (!match) return null;

                    const [price, metaJson] = await Promise.all([
                        throttledFetchPrice(BigInt(token.tokenId)),
                        getMetadataFromURI(match.uri),
                    ]);

                    const base = parseFloat(match.basePrice?.toString() || '0');
                    const current = parseFloat(price?.toString() || '0');
                    const percentChange = base > 0 ? ((current - base) / base) * 100 : null;

                    return {
                        ...token,
                        uri: match.uri,
                        basePrice: match.basePrice,
                        slope: match.slope,
                        reserve: match.reserve,
                        totalSupply: match.totalSupply,
                        price,
                        percentChange,
                        description: metaJson?.description ?? null,
                        imageUrl: metaJson?.image ? convertToIpfsUrl(metaJson.image) : null,
                    };
                })
            );

            const enrichedToAdd = enriched.filter(Boolean);
            if (enrichedToAdd.length > 0) {
                setTokens([...tokens, ...enrichedToAdd]);
            }
        } catch (err: any) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [newTokens, tokens, setTokens]);

    useEffect(() => {
        if (tokenId) {
            fetchSingle();
        } else if (newTokens.length > 0) {
            fetchAllAndEnrich();
        }
    }, [tokenId, newTokens, fetchSingle, fetchAllAndEnrich]);

    const refetch = useCallback(() => {
        if (tokenId) {
            fetchSingle();
        } else {
            refetchGraphQL();
            fetchAllAndEnrich();
        }
    }, [tokenId, fetchSingle, refetchGraphQL, fetchAllAndEnrich]);

    return {
        tokens: tokenId ? [] : tokens,
        token: tokenId ? token : null,
        loading,
        error,
        refetch,
        clearTokens,
    };
}
