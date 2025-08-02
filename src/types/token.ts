export type Token = {
    tokenId: string;
    name: string;
    symbol: string;
    blockTimestamp: string;
    uri: string;
    description: string | null;
    imageUrl: string | null;

    // Enrichable fields
    price?: bigint | string | number | null;
    basePrice?: bigint | null;
    slope?: bigint | null;
    reserve?: bigint | null;
    totalSupply?: bigint | null;
    percentChange?: number | null;
    priceLastFetchedAt?: number;
    needsPriceUpdate?: boolean;

    // Color for charting
    dominantColor?: any;

};
export type TokenMetadata = {
    name: any,
    symbol: any,
    uri: any,
    tokenId: any,
    reserve: any,
    totalSupply: any,
    creator: any,
}

export interface TokenCreated {
    id: string;
    tokenId: string;
    name: string;
    symbol: string;
    blockTimestamp: string;

}
export interface TokensQueryResult {
    pages: any;
    tokenCreateds: TokenCreated[];
}
