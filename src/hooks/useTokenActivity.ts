import { useEffect, useMemo } from 'react';
import { useTradeStore } from '../store/tradeStore';
import request, { gql } from 'graphql-request';
import { useQuery } from 'wagmi/query';
import { deepEqual } from 'wagmi';

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
  burneds(first: 5000) {
    id
    seller
    tokenId
    amount
    refund
    blockTimestamp
  }
  minteds(first: 5000) {
    id
    buyer
    tokenId
    amount
    cost
    blockTimestamp
  }
}
`;

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

function useAllTrades() {
    const setTrades = useTradeStore((state) => state.setTrades);
    const trades: any[] = useTradeStore((state) => state.trades['all'] ?? []);
    const shouldFetch = trades.length === 0;

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
        useEffect(() => {
            if (parsedTrades.length === 0) return;

            if (!deepEqual(trades, parsedTrades)) {
                setTrades('all', parsedTrades);
            }
        }, [parsedTrades, setTrades, trades]);
    }, [parsedTrades, setTrades, trades.length]);


    if (error) {
        console.error('[useAllTrades] Error fetching all trades:', error);
    }

    return trades;
}
export function useTokenActivity(tokenId: any) {
    const allTrades = useAllTrades();

    return useMemo(() => {
        return allTrades.filter(trade => trade.tokenId === tokenId);
    }, [allTrades, tokenId]);
}
