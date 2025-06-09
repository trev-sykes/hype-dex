export type MintCalculationResult = {
    tokensToMint: number;
    totalCostETH: number;
    refundETH: number;
};

export function calculateMint(
    ethSent: number,            // ETH sent by user (in ETH, not wei)
    basePrice: number,          // base price per token (in ETH)
    slope: number,              // price increase per token (in ETH)
    currentSupply: number,      // current total supply of the token
    maxTokensToTry: number = 1000 // safety limit to prevent infinite loop
): MintCalculationResult {
    let cost = 0;
    let tokensToMint = 0;

    for (let i = 0; i < maxTokensToTry; i++) {
        const unitPrice = basePrice + slope * (currentSupply + i);
        if (cost + unitPrice > ethSent) {
            break;
        }
        cost += unitPrice;
        tokensToMint++;
    }

    const refundETH = ethSent - cost;

    return {
        tokensToMint,
        totalCostETH: cost,
        refundETH,
    };
}
