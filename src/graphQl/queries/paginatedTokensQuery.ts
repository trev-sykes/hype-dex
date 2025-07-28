import { gql } from "graphql-request";

export const paginatedTokensQuery = gql`
  query Tokens($first: Int!, $skip: Int!) {
    tokenCreateds(first: $first, skip: $skip, orderBy: blockTimestamp, orderDirection: desc) {
      id
      tokenId
      name
      symbol
      blockTimestamp
    }
  }
`;