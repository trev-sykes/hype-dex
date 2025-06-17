export type Token = {
    tokenId: string;
    name: string;
    symbol: string;
    blockTimestamp: string;
    uri: string;
    description: string | null;
    imageUrl: string | null;

    // Enrichable fields
    price?: bigint | null;
    basePrice?: bigint | null;
    slope?: bigint | null;
    reserve?: bigint | null;
    totalSupply?: bigint | null;
    percentChange?: number | null;  // <--- add this

};
