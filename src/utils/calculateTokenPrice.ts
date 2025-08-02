
export function calculateTokenPrice(basePrice: string, slope: string, totalSupply: string): number {
    const base = BigInt(basePrice);
    const slopePerToken = BigInt(slope);
    const supply = BigInt(totalSupply);

    const priceWei = base + slopePerToken * supply;
    const priceEth = Number(priceWei) / 1e18;

    return priceEth;
}
