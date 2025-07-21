import { useEffect, useMemo } from 'react';
import { useTradeStore } from '../store/tradeStore';
import request, { gql } from 'graphql-request';
import { useQuery } from 'wagmi/query';
import { deepEqual } from 'wagmi';
import React from 'react';

interface Trade {
    tokenId: string;
    amount: string;
    cost: string;
    price: number;
    timestamp: number;
    type: 'mint' | 'burn';
}

const url = import.meta.env.VITE_GRAPHQL_URL;
const headers = { Authorization: 'Bearer {api-key}' };

const ALL_TRADES_QUERY = gql`
{
  burneds(first: 1000) {
    id
    seller
    tokenId
    amount
    refund
    blockTimestamp
  }
  minteds(first: 1000) {
    id
    buyer
    tokenId
    amount
    cost
    blockTimestamp
  }
}
`;
const TRADES_BY_TOKEN_QUERY = gql`
  query Trades($tokenIds: [BigInt!]) {
    burneds(where: { tokenId_in: $tokenIds }) {
      id
      seller
      tokenId
      amount
      refund
      blockTimestamp
    }
    minteds(where: { tokenId_in: $tokenIds }) {
      id
      buyer
      tokenId
      amount
      cost
      blockTimestamp
    }
  }
`;
export function useTradesForTokens(tokenIds: string[]) {
    const setTrades = useTradeStore((state) => state.setTrades);
    const tradesByToken = useTradeStore((state) => state.trades);

    // Only fetch if we don't already have trades for these tokens
    const missingTokenIds = tokenIds.filter(id => !tradesByToken[id]);

    const { data, isSuccess, error } = useQuery({
        queryKey: ['token-trades', missingTokenIds.sort().join(',')],
        queryFn: async () => {
            const result = await request(url, TRADES_BY_TOKEN_QUERY, { tokenIds: missingTokenIds }, headers);
            return result;
        },
        enabled: missingTokenIds.length > 0,
        refetchOnWindowFocus: false,
    });

    const parsedTrades: Trade[] = useMemo(() => {
        if (!data || !isSuccess) return [];
        return parseTrades(data);
    }, [data, isSuccess]);

    useEffect(() => {
        if (!parsedTrades.length) return;

        const groupedByToken: any = parsedTrades.reduce((acc, trade) => {
            if (!acc[trade.tokenId]) acc[trade.tokenId] = [];
            acc[trade.tokenId].push(trade);
            return acc;
        }, {} as Record<string, Trade[]>);

        for (const tokenId in groupedByToken) {
            setTrades(tokenId, groupedByToken[tokenId]);
        }
    }, [parsedTrades, setTrades]);

    if (error) {
        console.error('[useTradesForTokens] Error fetching trades:', error);
    }

    return tradesByToken;
}
function parseTrades(data: any): Trade[] {
    const WEI_IN_ETH = 1e18;

    const mints: Trade[] = data.minteds.map((m: any) => {
        const cost = Number(m.cost ?? 0);
        const amount = Number(m.amount || 1);
        return {
            tokenId: BigInt(m.tokenId).toString(),
            amount: BigInt(m.amount).toString(),
            cost: BigInt(cost).toString(),
            price: (cost / WEI_IN_ETH) / amount,
            timestamp: Number(m.blockTimestamp ?? 0),
            type: 'mint',
        };
    });

    const burns: Trade[] = data.burneds.map((b: any) => {
        const refund = Number(b.refund ?? 0);
        const amount = Number(b.amount || 1);
        return {
            tokenId: BigInt(b.tokenId).toString(),
            amount: BigInt(b.amount).toString(),
            cost: BigInt(refund).toString(),
            price: (refund / WEI_IN_ETH) / amount,
            timestamp: Number(b.blockTimestamp ?? 0),
            type: 'burn',
        };
    });

    return [...mints, ...burns].sort((a, b) => a.timestamp - b.timestamp);
}

export function useAllTrades() {
    const setTrades = useTradeStore((state) => state.setTrades);
    const trades: any[] = useTradeStore((state) => state.trades['all'] ?? []);
    const hydrated = useTradeStore(state => state.hydrated);
    const shouldFetch = hydrated && trades.length === 0;

    const { data, isSuccess, error } = useQuery({
        queryKey: ['all-trades'],
        queryFn: async () => {
            console.log('[GraphQL] Fetching all trades...');
            const result = await request(url, ALL_TRADES_QUERY, {}, headers);
            console.log('[GraphQL] Received all trades:', result);
            return result;
        },
        enabled: shouldFetch, // 👈 prevents query if trades already exist
        refetchInterval: 60_0000, // refresh every 1 minute
        refetchOnWindowFocus: false, // disable on tab switch
    });

    const parsedTrades: any = useMemo(() => {
        if (!data || !isSuccess) return [];
        return parseTrades(data);
    }, [data, isSuccess]);
    useEffect(() => {
        if (!parsedTrades.length) return;

        if (!deepEqual(trades, parsedTrades)) {
            setTrades('all', parsedTrades);
        }

    }, [parsedTrades, trades]);



    if (error) {
        console.error('[useAllTrades] Error fetching all trades:', error);
    }

    return trades;
}
export function useTokenActivity(tokenId: any) {
    const allTrades: any = useTradeStore(state => state.trades['all'] || []);
    // memoize filtering by tokenId only if allTrades or tokenId changes
    return React.useMemo(() => {
        return allTrades.filter((trade: any) => trade.tokenId === tokenId);
    }, [allTrades, tokenId]);
}

