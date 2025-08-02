import { useInfiniteQuery } from "wagmi/query";
import type { TokensQueryResult } from "../types/token";
import request from "graphql-request";
import { tokenCreatedQuery } from "./queries/tokenCreatedQuery";


const url = import.meta.env.VITE_GRAPHQL_URL;
const headers = { Authorization: 'Bearer {api-key}' };
export const fetchPaginatedTokens = (pageSize: any, enabled: any) => {
    return useInfiniteQuery<TokensQueryResult, Error, TokensQueryResult, string[]>({
        queryKey: ['tokens'],
        queryFn: async ({ pageParam = 0 }) => {
            console.log("[GraphQL] Fetching all tokens...")
            const result: any = await request(url, tokenCreatedQuery, { first: pageSize, skip: pageParam }, headers);
            console.log('[GraphQL] Received all trades:', result);
            return result
        },
        getNextPageParam: (lastPage, allPages) => {
            // If last page returned fewer than PAGE_SIZE, no more pages
            if (lastPage.tokenCreateds.length < pageSize) return undefined;
            return allPages.length * pageSize;
        },
        initialPageParam: 0,
        enabled: enabled,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
    });
}