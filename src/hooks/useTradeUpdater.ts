import { useTradeStore } from '../store/tradeStore';
import { useEffect } from 'react';
import request, { gql } from 'graphql-request';
import type { Trade } from '../types/trade';

const url = import.meta.env.VITE_GRAPHQL_URL;
const headers = { Authorization: 'Bearer {api-key}' };

const INCREMENTAL_QUERY = gql`
  query GetNewTrades($since: Int!) {
    burneds(where: { blockTimestamp_gt: $since }) {
      id
      tokenId
      amount
      refund
      blockTimestamp
    }
    minteds(where: { blockTimestamp_gt: $since }) {
      id
      tokenId
      amount
      cost
      blockTimestamp
    }
  }
`;

function parseTrades(data: any): Trade[] {
    const WEI_IN_ETH = 1e18;
    const mints = data.minteds.map((m: any) => {
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

    const burns = data.burneds.map((b: any) => {
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

export function useTradeUpdater() {
    const appendTrade = useTradeStore((s) => s.appendTrade);
    const getLatestTimestamp = useTradeStore((s) => s.getLatestTimestamp);

    useEffect(() => {
        const interval = setInterval(async () => {
            const since = getLatestTimestamp('all');

            try {
                const result = await request(url, INCREMENTAL_QUERY, { since }, headers);
                const newTrades = parseTrades(result);

                newTrades.forEach((trade) => {
                    appendTrade('all', trade);
                });

            } catch (e) {
                console.error('[TradeUpdater] Error fetching new trades', e);
            }
        }, 30_000); // Every 30 seconds

        return () => clearInterval(interval);
    }, []);
}
