export interface Trade {
    tokenId: bigint;
    amount: bigint;
    cost: bigint;
    price: number;
    timestamp: number;
    type: 'mint' | 'burn';
}
