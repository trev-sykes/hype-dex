import { GraphQLClient } from 'graphql-request';

const url = import.meta.env.VITE_GRAPHQL_URL;
const headers = { Authorization: 'Bearer {api-key}' };

export const graphqlClient = new GraphQLClient(url, { headers });
