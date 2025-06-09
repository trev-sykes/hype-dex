import pThrottle from 'p-throttle';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTokenStore } from '../store/allTokensStore';
import request, { gql } from 'graphql-request';
import { useQuery } from 'wagmi/query';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { ETHBackedTokenMinterABI, ETHBackedTokenMinterAddress } from '../services/ETHBackedTokenMinter';
import { convertToIpfsUrl } from '../utils/ipfs';

type TokenCreated = {
    id: string;
    tokenId: string;
    name: string;
    symbol: string;
    blockTimestamp: string;
};

type TokenCreatedResponse = {
    tokenCreateds: TokenCreated[];
};
const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC
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

async function getMetadataFromURI(uri: string) {
    const url = convertToIpfsUrl(uri);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch IPFS data: ${res.statusText}`);
        return await res.json();
    } catch (err) {
        console.error("getMetadataFromURI error:", err);
        return null;
    }
}

// Fetch metadata for a single tokenId on-chain, including price & ipfs data
async function fetchSingleToken(tokenId: string | bigint) {
    const idStr = tokenId.toString();
    try {
        // Fetch all tokenIds (to find metadata index)
        const allTokenIds: bigint[] = await fetchAllTokenIds();
        const index = allTokenIds.findIndex(id => id.toString() === idStr);
        if (index === -1) {
            console.warn(`TokenId ${idStr} not found in on - chain token IDs.`);
            return null;
        }
        // Fetch metadata for this token only (start=index, count=1)
        const [meta]: any = await fetchTokenMetadataRange(index, 1);
        if (!meta) {
            console.warn(`No metadata found for tokenId ${idStr}`);
            return null;
        }

        const [price, metaJson] = await Promise.all([
            fetchPrice(BigInt(idStr)),
            getMetadataFromURI(meta.uri),
        ]);

        // Return enriched token data
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
    const tokens = useTokenStore(state => state.tokens);
    const setTokens = useTokenStore(state => state.setTokens);
    const addToken = useTokenStore(state => state.addToken);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [token, setToken] = useState<any>(null); // single token when tokenId passed

    // --- 1) If tokenId provided: fetch single token on-chain data ---
    const fetchSingle = useCallback(async () => {
        if (!tokenId) return;
        setLoading(true);
        setError(null);

        try {
            const result: any = await fetchSingleToken(tokenId);
            setToken(result);
            if (result) addToken(result); // add/update store
        } catch (err: any) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [tokenId, addToken]);

    // --- 2) If no tokenId, fetch all tokens via GraphQL + enrich on-chain ---
    const { data, isSuccess, error: gqlError, refetch: refetchGraphQL } = useQuery<any, Error, TokenCreatedResponse, any>({
        queryKey: ['tokens'],
        queryFn: () => request<TokenCreatedResponse>(url, tokenCreatedQuery, {}, headers),
        refetchInterval: 10_000,
        refetchOnWindowFocus: true,
        enabled: !tokenId,
    });

    const newTokens = useMemo(() => {
        if (!data || !isSuccess) return [];
        return data.tokenCreateds;
    }, [data, isSuccess]);

    const fetchAllAndEnrich = useCallback(async () => {
        if (!newTokens.length) return;
        setLoading(true);
        setError(null);

        try {
            const tokenIds = await fetchAllTokenIds();
            const count = tokenIds.length;
            if (count === 0) {
                console.warn("No token IDs found.");
                setLoading(false);
                return;
            }

            const rawMetadata: any = await fetchTokenMetadataRange(0, count);

            // 👇 Throttle expensive fetchPrice() calls
            const throttledFetchPrice = pThrottle({
                limit: 5,
                interval: 1000,
            })(fetchPrice);

            const enriched = await Promise.all(
                newTokens.map(async (token: any) => {
                    const tokenIdStr = token.tokenId.toString();
                    const match = rawMetadata.find((m: any) => m.tokenId.toString() === tokenIdStr);
                    if (!match) {
                        console.warn("No metadata match for tokenId:", token.tokenId);
                        return { ...token, price: null, percentChange: null, description: null, imageUrl: null };
                    }

                    const [price, metaJson] = await Promise.all([
                        throttledFetchPrice(BigInt(token.tokenId)),
                        getMetadataFromURI(match.uri),
                    ]);

                    // 🧮 Calculate percentChange inside map after basePrice is available
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

            if (tokens.length === 0) {
                setTokens(enriched);
            } else {
                enriched.forEach((token) => {
                    if (!tokens.find((t) => t.tokenId === token.tokenId)) {
                        addToken(token);
                    }
                });
            }
        } catch (err: any) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [newTokens, tokens, setTokens, addToken]);



    // Run fetch functions depending on presence of tokenId
    useEffect(() => {
        if (tokenId) {
            fetchSingle();
        } else if (newTokens.length > 0) {
            fetchAllAndEnrich();
        }
    }, [tokenId, newTokens, fetchSingle, fetchAllAndEnrich]);

    // Refetch function exposed for manual refresh
    const refetch = useCallback(() => {
        if (tokenId) {
            fetchSingle();
        } else {
            refetchGraphQL();
            fetchAllAndEnrich();
        }
    }, [tokenId, fetchSingle, refetchGraphQL, fetchAllAndEnrich]);

    if (gqlError) console.error('[useTokens] GraphQL error:', gqlError);
    if (error) console.error('[useTokens] error:', error);

    return {
        tokens: tokenId ? [] : tokens,
        token: tokenId ? token : null,
        loading,
        error,
        refetch,
    };
}