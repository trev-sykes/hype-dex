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
        let retryDelay = 30000; // Start at 30 seconds
        let timeoutId: NodeJS.Timeout;

        const fetchTokens = async () => {
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
                }

                retryDelay = 30000; // Reset backoff on success
            } catch (e: any) {
                if (e?.response?.status === 429) {
                    retryDelay = Math.min(retryDelay * 2, 5 * 60 * 1000); // Cap at 5 minutes
                    console.warn('[TokenCreationUpdater] Rate limited, increasing retry delay to', retryDelay);
                } else {
                    console.error('[TokenCreationUpdater] Error fetching new tokens', e);
                }
            } finally {
                timeoutId = setTimeout(fetchTokens, retryDelay);
            }
        };

        fetchTokens();

        return () => clearTimeout(timeoutId);
    }, []);

}
