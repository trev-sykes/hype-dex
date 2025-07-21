import { useTokenStore } from '../store/allTokensStore';
import { useEffect } from 'react';
import request, { gql } from 'graphql-request';

const url = import.meta.env.VITE_GRAPHQL_URL;
const headers = { Authorization: 'Bearer {api-key}' };

const TOKEN_CREATED_INCREMENTAL_QUERY = gql`
  query GetNewTokenCreated($since: Int!) {
    tokenCreateds(where: { blockTimestamp_gt: $since }) {
      tokenId
      name
      symbol
      blockTimestamp
    }
  }
`;

export function useTokenCreationUpdater() {
    const appendToken = useTokenStore((s: any) => s.appendToken);
    const getLatestTimestamp = useTokenStore((s: any) => s.getLatestTimestamp);

    useEffect(() => {
        const interval = setInterval(async () => {
            const since = getLatestTimestamp();

            try {
                const result: any = await request(url, TOKEN_CREATED_INCREMENTAL_QUERY, { since }, headers);
                const newTokens = result.tokenCreateds || [];

                newTokens.forEach((token: any) => {
                    appendToken({
                        tokenId: token.tokenId,
                        name: token.name,
                        symbol: token.symbol,
                        blockTimestamp: token.blockTimestamp,
                        uri: token.uri,
                    });
                });

                if (newTokens.length > 0) {
                    console.log(`[TokenCreationUpdater] Appended ${newTokens.length} new tokens`);
                }
            } catch (e) {
                console.error('[TokenCreationUpdater] Error fetching new tokens', e);
            }
        }, 30_000); // 30 seconds

        return () => clearInterval(interval);
    }, []);
}
