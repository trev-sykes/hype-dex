import { useEffect, useMemo } from 'react';
import { useTradeStore } from '../store/tradeStore';
import request, { gql } from 'graphql-request';
import { useQuery } from 'wagmi/query';

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

function buildQuery(tokenIdFilter?: string) {
    const whereClause = tokenIdFilter
        ? `, where: { tokenId: "${tokenIdFilter}" }`
        : '';

    return gql`
    {
      burneds(first: 100${whereClause}) {
        id
        seller
        tokenId
        amount
        refund
        blockTimestamp
      }
      minteds(first: 100${whereClause}) {
        id
        buyer
        tokenId
        amount
        cost
        blockTimestamp
      }
    }
  `;
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

export function useTokenActivity(tokenIdFilter?: string) {
    const key = tokenIdFilter ?? 'all';
    const trades = useTradeStore((state) => state.trades[key]);
    const setTrades = useTradeStore((state) => state.setTrades);

    const { data, isSuccess, error } = useQuery({
        queryKey: ['trades', tokenIdFilter],
        queryFn: async () => {
            const q = buildQuery(tokenIdFilter);
            return await request(url, q, {}, headers);
        },
        refetchInterval: 10_000, // ✅ Auto-refresh every 10 seconds
        refetchOnWindowFocus: true, // Optional: refetch when user focuses the tab
    });

    const parsedTrades: any = useMemo(() => {
        if (!data || !isSuccess) return [];
        return parseTrades(data);
    }, [data, isSuccess]);

    useEffect(() => {
        if (parsedTrades.length > 0) {
            setTrades(key, parsedTrades);
        }
    }, [parsedTrades, key, setTrades]);

    if (error) {
        console.error('[useTrades] GraphQL error:', error);
    }

    return trades ?? [];
}
